using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Dtos;
using CrownAndClipper.Api.Models;
using CrownAndClipper.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

public record CreateUserRequest(string? Name, string? Email, string? Password, string? Role, string? BarberSlug);
public record SetActiveRequest(bool Active);

/// <summary>
/// Owner/admin dashboard: the whole tenant's bookings, inbox, signup list,
// simple stats, and staff account management. Everything is tenant-scoped by
/// the DbContext query filters.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = Roles.Admin)]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly Services.ReminderService _reminders;
    private readonly Services.IEmailSender _email;

    public AdminController(AppDbContext db, ITenantContext tenant,
        Services.ReminderService reminders, Services.IEmailSender email)
    {
        _db = db;
        _tenant = tenant;
        _reminders = reminders;
        _email = email;
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> Bookings(
        [FromQuery] string? date, [FromQuery] int? barberId, [FromQuery] string? status)
    {
        var query = _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Barber)
            .AsQueryable();

        if (DateOnly.TryParseExact(date, "yyyy-MM-dd", out var d))
            query = query.Where(b => b.Date == d);
        if (barberId is int bid)
            query = query.Where(b => b.BarberId == bid);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(b => b.Status == status);

        var bookings = (await query.ToListAsync())
            // SQLite cannot ORDER BY TimeSpan, so order in memory before paging.
            .OrderByDescending(b => b.Date)
            .ThenBy(b => b.StartTime)
            .Take(500)
            .ToList();

        var shop = await BookingMapper.ShopAsync(_db, _tenant.Id);
        return Ok(bookings.Select(b => BookingMapper.ToResponse(b, b.Service, b.Barber, shop)));
    }

    [HttpPost("bookings/{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var booking = await _db.Bookings.FindAsync(id);
        if (booking is null) return NotFound(new { message = "Booking not found." });
        if (booking.Status != "Confirmed")
            return BadRequest(new { message = "This booking is already cancelled." });

        booking.Status = "Cancelled";
        await _db.SaveChangesAsync();

        var tenant = await _db.Tenants.FindAsync(_tenant.Id);
        if (tenant is not null)
        {
            var withService = await _db.Bookings
                .Include(b => b.Service)
                .FirstAsync(b => b.Id == booking.Id);
            await _reminders.BookingCancelledAsync(tenant, withService);
        }

        return Ok(new { ok = true, message = $"Booking {booking.Reference} cancelled." });
    }

    [HttpGet("messages")]
    public async Task<IActionResult> Messages()
    {
        var messages = await _db.ContactMessages
            .OrderByDescending(m => m.CreatedAtUtc)
            .Take(200)
            .Select(m => new
            {
                m.Id,
                m.Name,
                m.Email,
                m.Phone,
                m.Subject,
                m.Message,
                received = m.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
            })
            .ToListAsync();

        return Ok(messages);
    }

    [HttpGet("signups")]
    public async Task<IActionResult> Signups()
    {
        var signups = await _db.NewsletterSignups
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(500)
            .Select(n => new { n.Id, n.Email, n.Source, received = n.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm") })
            .ToListAsync();

        return Ok(signups);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var today = ShopClock.Today;
        var weekEnd = today.AddDays(7);

        var todayCount = await _db.Bookings.CountAsync(b => b.Date == today && b.Status == "Confirmed");
        var weekBookings = await _db.Bookings
            .Include(b => b.Service)
            .Where(b => b.Date >= today && b.Date < weekEnd && b.Status == "Confirmed")
            .ToListAsync();
        var totalConfirmed = await _db.Bookings.CountAsync(b => b.Status == "Confirmed");
        var signups = await _db.NewsletterSignups.CountAsync();
        var messages = await _db.ContactMessages.CountAsync();
        var customers = await _db.Users.CountAsync(u => u.Role == Roles.Customer);

        return Ok(new
        {
            today = todayCount,
            next7Days = weekBookings.Count,
            revenueNext7Days = weekBookings.Sum(b => b.Service.Price),
            totalConfirmed,
            newsletterSignups = signups,
            contactMessages = messages,
            registeredCustomers = customers,
        });
    }

    // ------------------------------------------------------------------
    // Notification outbox
    // ------------------------------------------------------------------

    /// <summary>Email + in-app message log for this tenant, newest first.</summary>
    [HttpGet("notifications")]
    public async Task<IActionResult> Notifications([FromQuery] string? status)
    {
        var query = _db.Notifications.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(n => n.Status == status);

        var items = await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(200)
            .Select(n => new
            {
                n.Id,
                n.Kind,
                n.Channel,
                n.Status,
                n.RecipientName,
                n.RecipientEmail,
                n.Subject,
                n.Attempts,
                n.BookingId,
                createdAtUtc = n.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                sentAtUtc = n.SentAtUtc,
                readAtUtc = n.ReadAtUtc,
            })
            .ToListAsync();

        return Ok(new { provider = _email.ProviderName, items });
    }

    /// <summary>Re-queue a failed email for another dispatch attempt.</summary>
    [HttpPost("notifications/{id}/resend")]
    public async Task<IActionResult> ResendNotification(int id)
    {
        var notification = await _db.Notifications.FindAsync(id);
        if (notification is null) return NotFound(new { message = "Notification not found." });
        if (notification.Channel != "Email")
            return BadRequest(new { message = "Only email notifications can be resent." });
        if (notification.Status != "Failed")
            return BadRequest(new { message = "Only failed notifications can be resent." });

        notification.Status = "Pending";
        notification.Attempts = 0;
        await _db.SaveChangesAsync();

        var sent = await _reminders.DispatchPendingAsync(_tenant.Id);
        return Ok(new { ok = true, sent });
    }

    /// <summary>
    /// Run a reminder scan + outbox dispatch for this tenant right now
    /// (the background worker does this automatically every few minutes).
    /// </summary>
    [HttpPost("notifications/run")]
    public async Task<IActionResult> RunReminders()
    {
        var created = await _reminders.ScanAndEnqueueAsync(_tenant.Id);
        var sent = await _reminders.DispatchPendingAsync(_tenant.Id);
        return Ok(new { created, sent, provider = _email.ProviderName });
    }

    /// <summary>Create staff or admin accounts for this tenant.</summary>
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var name = InputSanitizer.SingleLine(request.Name);
        var email = InputSanitizer.SingleLine(request.Email).ToLowerInvariant();
        var password = request.Password ?? "";
        var role = InputSanitizer.SingleLine(request.Role);

        if (role != Roles.Stylist && role != Roles.Admin)
            return BadRequest(new { message = "Role must be Stylist or Admin." });
        if (!InputSanitizer.IsValidName(name)) return BadRequest(new { message = "Please provide a valid name." });
        if (!InputSanitizer.IsValidEmail(email)) return BadRequest(new { message = "Please provide a valid email." });
        if (password.Length < 10 || password.Length > 128)
            return BadRequest(new { message = "Passwords must be 10-128 characters." });

        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "An account with this email already exists in this shop." });

        int? barberId = null;
        if (role == Roles.Stylist)
        {
            var slug = InputSanitizer.SingleLine(request.BarberSlug);
            var barber = await _db.Barbers.FirstOrDefaultAsync(b => b.Slug == slug);
            if (barber is null)
                return BadRequest(new { message = "Stylist accounts must link to a staff profile (barberSlug)." });
            barberId = barber.Id;
        }

        var user = new User
        {
            TenantId = _tenant.Id,
            Name = name,
            Email = email,
            PasswordHash = PasswordHasher.Hash(password),
            Role = role,
            BarberId = barberId,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Created("/api/admin/users", UserDto.From(user, _tenant.Slug));
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users()
    {
        var users = await _db.Users
            .Include(u => u.Barber)
            .OrderBy(u => u.Role).ThenBy(u => u.Name)
            .ToListAsync();

        return Ok(users.Select(u => UserDto.From(u, _tenant.Slug)));
    }

    [HttpPost("users/{id}/active")]
    public async Task<IActionResult> SetActive(int id, [FromBody] SetActiveRequest request)
    {
        var me = User.UserId();
        if (me == id)
            return BadRequest(new { message = "You can't disable your own account." });

        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "Account not found." });

        user.Active = request.Active;
        await _db.SaveChangesAsync();
        return Ok(UserDto.From(user, _tenant.Slug));
    }
}
