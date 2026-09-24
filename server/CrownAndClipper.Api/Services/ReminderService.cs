using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Services;

/// <summary>
/// The notification engine:
///  - ScanAndEnqueueAsync: finds bookings inside reminder windows (client 24 h
///    and 2 h, stylist 2 h, stylist day-ahead digest) and creates idempotent
///    Email + InApp notification rows (DedupeKey prevents duplicates).
///  - DispatchPendingAsync: pushes Pending email rows through IEmailSender
///    with up to 3 attempts, marking Sent/Failed.
///  - BookingConfirmedAsync / BookingCancelledAsync: event-driven messages
///    called straight from the booking lifecycle.
/// Works across tenants (scheduler) or for a single tenant (admin trigger).
/// </summary>
public class ReminderService
{
    private static readonly TimeSpan Client24hFrom = TimeSpan.FromHours(23);
    private static readonly TimeSpan Client24hTo = TimeSpan.FromHours(25);
    private static readonly TimeSpan TwoHoursFrom = TimeSpan.FromMinutes(115);
    private static readonly TimeSpan TwoHoursTo = TimeSpan.FromMinutes(125);

    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly IConfiguration _config;
    private readonly ILogger<ReminderService> _logger;

    public ReminderService(
        AppDbContext db,
        IEmailSender email,
        IConfiguration config,
        ILogger<ReminderService> logger)
    {
        _db = db;
        _email = email;
        _config = config;
        _logger = logger;
    }

    private string SiteUrl => (_config["SITE_BASE_URL"] ?? "http://localhost:5173").TrimEnd('/');

    // ------------------------------------------------------------------
    // Scheduler pass
    // ------------------------------------------------------------------
    public async Task<int> ScanAndEnqueueAsync(int? tenantIdFilter, CancellationToken ct = default)
    {
        var created = 0;

        var tenants = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.Active && (tenantIdFilter == null || t.Id == tenantIdFilter))
            .ToListAsync(ct);

        foreach (var tenant in tenants)
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById(tenant.Timezone);
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
            var today = DateOnly.FromDateTime(nowLocal);

            var bookings = await _db.Bookings
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Include(b => b.Service)
                .Include(b => b.Barber)
                .Where(b => b.TenantId == tenant.Id
                            && b.Status == "Confirmed"
                            && b.Date >= today
                            && b.Date <= today.AddDays(2))
                .ToListAsync(ct);

            foreach (var booking in bookings)
            {
                var start = booking.Date.ToDateTime(TimeOnly.FromTimeSpan(booking.StartTime));
                var until = start - nowLocal;

                if (until > Client24hFrom && until <= Client24hTo)
                {
                    created += await ClientNotificationsAsync(tenant, booking,
                        NotificationKinds.ClientReminder24h,
                        NotificationTemplates.ClientReminder24h(tenant, booking, SiteUrl), ct);
                }

                if (until > TwoHoursFrom && until <= TwoHoursTo)
                {
                    created += await ClientNotificationsAsync(tenant, booking,
                        NotificationKinds.ClientReminder2h,
                        NotificationTemplates.ClientReminder2h(tenant, booking, SiteUrl), ct);
                    created += await StaffNotificationsAsync(tenant, booking,
                        NotificationKinds.StaffReminder2h,
                        NotificationTemplates.StaffReminder2h(tenant, booking, SiteUrl), ct);
                }
            }

            // Day-ahead digest: after 18:00 shop time, summarise tomorrow per stylist.
            if (nowLocal.Hour >= 18)
            {
                var tomorrow = today.AddDays(1);
                var tomorrowBookings = bookings.Where(b => b.Date == tomorrow).ToList();
                if (tomorrowBookings.Count > 0 && OpeningHours.ForDate(tomorrow) is not null)
                {
                    foreach (var group in tomorrowBookings.GroupBy(b => b.BarberId))
                    {
                        var list = group.OrderBy(b => b.StartTime).ToList();
                        created += await StaffNotificationsAsync(tenant, list[0],
                            NotificationKinds.StaffDayAhead,
                            NotificationTemplates.StaffDayAhead(tenant, list[0].Barber, list, SiteUrl),
                            ct,
                            dedupeSuffix: tomorrow.ToString("yyyyMMdd"));
                    }
                }
            }
        }

        return created;
    }

    // ------------------------------------------------------------------
    // Outbox dispatch
    // ------------------------------------------------------------------
    public async Task<int> DispatchPendingAsync(int? tenantIdFilter, CancellationToken ct = default)
    {
        var pending = await _db.Notifications
            .IgnoreQueryFilters()
            .Where(n => n.Channel == NotificationChannels.Email
                        && n.Status == NotificationStatuses.Pending
                        && n.Attempts < 3
                        && (tenantIdFilter == null || n.TenantId == tenantIdFilter))
            .OrderBy(n => n.CreatedAtUtc)
            .Take(50)
            .ToListAsync(ct);

        var sent = 0;
        foreach (var notification in pending)
        {
            var tenant = await _db.Tenants.IgnoreQueryFilters().AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == notification.TenantId, ct);
            if (tenant is null) continue;

            var from = _config["SMTP:From"] ?? $"\"{tenant.Name}\" <{tenant.Email}>";

            notification.Attempts += 1;
            try
            {
                await _email.SendAsync(new EmailMessage(
                    from, notification.RecipientEmail, notification.Subject, notification.Body), ct);
                notification.Status = NotificationStatuses.Sent;
                notification.SentAtUtc = DateTime.UtcNow;
                sent += 1;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Email dispatch failed for notification {Id} (attempt {Attempt})",
                    notification.Id, notification.Attempts);
                notification.Status = notification.Attempts >= 3
                    ? NotificationStatuses.Failed
                    : NotificationStatuses.Pending;
            }
        }

        if (pending.Count > 0) await _db.SaveChangesAsync(ct);
        return sent;
    }

    // ------------------------------------------------------------------
    // Booking lifecycle events
    // ------------------------------------------------------------------
    public Task<int> BookingConfirmedAsync(Tenant tenant, Booking booking, CancellationToken ct = default)
        => SendPairAsync(tenant, booking, NotificationKinds.BookingConfirmed,
            NotificationTemplates.BookingConfirmed(tenant, booking, SiteUrl), ct);

    public Task<int> BookingCancelledAsync(Tenant tenant, Booking booking, CancellationToken ct = default)
        => SendPairAsync(tenant, booking, NotificationKinds.BookingCancelled,
            NotificationTemplates.BookingCancelled(tenant, booking, SiteUrl), ct);

    private async Task<int> SendPairAsync(Tenant tenant, Booking booking, string kind,
        (string Subject, string Body) message, CancellationToken ct)
    {
        var created = 0;
        created += await ClientNotificationsAsync(tenant, booking, kind, message, ct);
        created += await StaffNotificationsAsync(tenant, booking, kind, message, ct);
        return created;
    }

    // ------------------------------------------------------------------
    // Recipient helpers
    // ------------------------------------------------------------------
    private Task<int> ClientNotificationsAsync(Tenant tenant, Booking booking, string kind,
        (string Subject, string Body) message, CancellationToken ct) =>
        EnsurePairAsync(tenant, booking, kind, message,
            userId: booking.UserId,
            email: booking.CustomerEmail,
            name: booking.CustomerName,
            dedupeSuffix: null, ct);

    private async Task<int> StaffNotificationsAsync(Tenant tenant, Booking booking, string kind,
        (string Subject, string Body) message, CancellationToken ct, string? dedupeSuffix = null)
    {
        // Staff messages go to the stylist's account (in-app) and email.
        var stylist = await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id
                                      && u.BarberId == booking.BarberId
                                      && u.Role == Roles.Stylist
                                      && u.Active, ct);

        if (stylist is null) return 0;

        return await EnsurePairAsync(tenant, booking, kind, message,
            userId: stylist.Id,
            email: stylist.Email,
            name: stylist.Name,
            dedupeSuffix, ct);
    }

    /// <summary>
    /// Creates the Email + InApp rows for one recipient unless the dedupe key
    /// already exists (unique index is the final backstop).
    /// </summary>
    private async Task<int> EnsurePairAsync(Tenant tenant, Booking booking, string kind,
        (string Subject, string Body) message, int? userId, string email, string name,
        string? dedupeSuffix, CancellationToken ct)
    {
        var created = 0;

        foreach (var channel in new[] { NotificationChannels.Email, NotificationChannels.InApp })
        {
            // Recipient must be part of the key: one booking event produces one
            // message per recipient per channel.
            var recipient = userId?.ToString() ?? email;
            var key = $"{kind}|{channel}|{booking.Id}|{recipient}"
                      + (dedupeSuffix is null ? "" : $"|{dedupeSuffix}");

            var exists = await _db.Notifications
                .IgnoreQueryFilters()
                .AnyAsync(n => n.TenantId == tenant.Id && n.DedupeKey == key, ct);
            if (exists) continue;

            _db.Notifications.Add(new Notification
            {
                TenantId = tenant.Id,
                UserId = userId,
                BookingId = booking.Id,
                Kind = kind,
                Channel = channel,
                RecipientName = name,
                RecipientEmail = email,
                Subject = message.Subject,
                Body = message.Body,
                // InApp rows land in the inbox immediately; Email rows wait for dispatch.
                Status = channel == NotificationChannels.InApp
                    ? NotificationStatuses.Sent
                    : NotificationStatuses.Pending,
                SentAtUtc = channel == NotificationChannels.InApp ? DateTime.UtcNow : null,
                DedupeKey = key,
            });
            created += 1;
        }

        if (created > 0) await _db.SaveChangesAsync(ct);
        return created;
    }
}

/// <summary>
/// Runs the reminder scan + outbox dispatch on an interval for all tenants.
/// Admins can also trigger a per-tenant pass from the dashboard.
/// </summary>
public class ReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<ReminderWorker> _logger;
    private readonly TimeSpan _interval;

    public ReminderWorker(IServiceScopeFactory scopes, IConfiguration config, ILogger<ReminderWorker> logger)
    {
        _scopes = scopes;
        _logger = logger;
        var minutes = int.TryParse(config["Reminders:IntervalMinutes"], out var m) ? m : 5;
        _interval = TimeSpan.FromMinutes(Math.Clamp(minutes, 1, 60));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the host finish starting up (schema + seed) before the first pass.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopes.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<ReminderService>();
                var enqueued = await service.ScanAndEnqueueAsync(null, stoppingToken);
                var sent = await service.DispatchPendingAsync(null, stoppingToken);
                if (enqueued + sent > 0)
                {
                    _logger.LogInformation("Reminder cycle: {Enqueued} enqueued, {Sent} dispatched", enqueued, sent);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Reminder cycle failed");
            }

            try
            {
                await Task.Delay(_interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
