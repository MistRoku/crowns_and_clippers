using System.Security.Cryptography;
using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Dtos;
using CrownAndClipper.Api.Models;
using CrownAndClipper.Api.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

public record CreateBookingRequest(
    int ServiceId,
    int? BarberId,          // null = "No preference" - we assign the first free barber
    string? Date,           // yyyy-MM-dd
    string? Time,           // HH:mm (24h, shop local time)
    string? Name,
    string? Email,
    string? Phone,
    string? Notes);

public record LookupBookingRequest(string? Reference, string? Email);

[ApiController]
[Route("api/bookings")]
[RequestSizeLimit(64 * 1024)]
public class BookingsController : ControllerBase
{
    // 32 symbols, no visually-confusing characters (0/O, 1/I).
    private const string ReferenceAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /// <summary>
    /// Process-wide gate around booking creation. Together with the unique
    /// (BarberId, Date, StartTime) index this closes the race where two
    /// simultaneous requests could double-book the same chair.
    /// </summary>
    private static readonly SemaphoreSlim BookingGate = new(initialCount: 1, maxCount: 1);

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly Services.ReminderService _reminders;

    public BookingsController(AppDbContext db, ITenantContext tenant, Services.ReminderService reminders)
    {
        _db = db;
        _tenant = tenant;
        _reminders = reminders;
    }

    [HttpPost]
    [EnableRateLimiting("booking")]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequest request)
    {
        // ---- Service -------------------------------------------------------
        var service = await _db.Services.FindAsync(request.ServiceId);
        if (service is null)
            return BadRequest(new { message = "Please choose a service." });

        // ---- Barber: only staff qualified for the chosen service ----------
        var qualifiedIds = await _db.ServiceBarbers
            .Where(l => l.ServiceId == service.Id)
            .Select(l => l.BarberId)
            .ToListAsync();

        List<Barber> candidates;
        Barber? requestedBarber = null;
        if (request.BarberId is int bid)
        {
            requestedBarber = await _db.Barbers.FindAsync(bid);
            if (requestedBarber is null)
                return BadRequest(new { message = "Please choose a barber." });
            if (!qualifiedIds.Contains(bid))
            {
                return BadRequest(new
                {
                    message = $"{requestedBarber.Name} doesn't offer {service.Name}. Please choose a qualified stylist."
                });
            }
            candidates = new List<Barber> { requestedBarber };
        }
        else
        {
            candidates = await _db.Barbers
                .Where(b => qualifiedIds.Contains(b.Id))
                .OrderBy(b => b.SortOrder)
                .ToListAsync();
        }

        // ---- Customer details: sanitise first, then validate shape ---------
        var name = InputSanitizer.SingleLine(request.Name);
        var email = InputSanitizer.SingleLine(request.Email).ToLowerInvariant();
        var phone = InputSanitizer.SingleLine(request.Phone);
        var notes = InputSanitizer.MultiLine(request.Notes);

        var errors = new List<string>();
        if (!InputSanitizer.IsValidName(name)) errors.Add("Please tell us your full name.");
        if (!InputSanitizer.IsValidEmail(email)) errors.Add("Please provide a valid email address.");
        if (!InputSanitizer.IsValidPhone(phone)) errors.Add("Please provide a valid phone number.");
        if (notes.Length > 500) errors.Add("Notes must be under 500 characters.");
        if (errors.Count > 0) return BadRequest(new { message = string.Join(" ", errors) });

        // ---- Date & time ----------------------------------------------------
        if (!DateOnly.TryParseExact(request.Date, "yyyy-MM-dd", out var date))
            return BadRequest(new { message = "Please choose a valid date." });

        if (date < ShopClock.Today)
            return BadRequest(new { message = "Please choose today or a future date." });

        // No bookings more than a year out (limits abuse of the slot grid).
        if (date > ShopClock.Today.AddYears(1))
            return BadRequest(new { message = "We only take bookings up to one year ahead." });

        var hours = OpeningHours.ForDate(date);
        if (hours is null)
            return BadRequest(new { message = "We're closed on Sundays - please pick another day." });

        if (!TimeSpan.TryParse(request.Time, out var start))
            return BadRequest(new { message = "Please choose a valid time." });

        var validSlots = OpeningHours.SlotsForDate(date, service.DurationMinutes);
        if (!validSlots.Contains(start))
            return BadRequest(new { message = "That time slot isn't available. Please pick another." });

        var end = start + TimeSpan.FromMinutes(service.DurationMinutes);

        if (date == ShopClock.Today && start < ShopClock.Now.TimeOfDay + ShopClock.MinimumLeadTime)
            return BadRequest(new { message = "Same-day bookings need at least one hour's notice." });

        // ---- Create under the gate: check-then-insert is atomic per process,
        //      and the unique index is the database-level backstop.
        if (!await BookingGate.WaitAsync(TimeSpan.FromSeconds(5)))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new { message = "Bookings are busy right this second. Please try again." });
        }

        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync();

            var existing = await _db.Bookings
                .Where(b => b.Date == date && b.Status == "Confirmed")
                .Select(b => new { b.BarberId, b.StartTime, b.EndTime })
                .ToListAsync();

            Barber? assigned = null;
            foreach (var candidate in candidates)
            {
                var clash = existing.Any(b =>
                    b.BarberId == candidate.Id && b.StartTime < end && start < b.EndTime);
                if (!clash)
                {
                    assigned = candidate;
                    break;
                }
            }

            if (assigned is null)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = requestedBarber is not null
                        ? $"{requestedBarber.Name} was just booked at that time. Please choose another slot."
                        : "Every barber was just booked at that time. Please choose another slot."
                });
            }

            var booking = new Booking
            {
                TenantId = _tenant.Id,
                UserId = User.Identity?.IsAuthenticated == true ? User.UserId() : null,
                Reference = await GenerateReferenceAsync(),
                ServiceId = service.Id,
                BarberId = assigned.Id,
                Date = date,
                StartTime = start,
                EndTime = end,
                CustomerName = name,
                CustomerEmail = email,
                CustomerPhone = phone,
                Notes = string.IsNullOrWhiteSpace(notes) ? null : notes,
                Status = "Confirmed"
            };

            _db.Bookings.Add(booking);

            try
            {
                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException)
            {
                // Unique-index backstop (BarberId, Date, StartTime).
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = "That slot was just taken. Please choose another slot."
                });
            }

            // Confirmation notices to the client and the stylist (email + in-app).
            var tenant = await _db.Tenants.FindAsync(_tenant.Id);
            if (tenant is not null)
            {
                booking.Service = service;
                booking.Barber = assigned;
                await _reminders.BookingConfirmedAsync(tenant, booking);
            }

            var shop = await BookingMapper.ShopAsync(_db, _tenant.Id);
            var response = BookingMapper.ToResponse(booking, service, assigned, shop);
            return Created($"/api/bookings/lookup", response);
        }
        finally
        {
            BookingGate.Release();
        }
    }

    /// <summary>
    /// Look up a booking by reference AND the email address it was made with.
    /// Both factors must match, so a guessed reference reveals nothing:
    /// the same 404 is returned for "unknown" and "not yours".
    /// </summary>
    [HttpPost("lookup")]
    [EnableRateLimiting("lookup")]
    public async Task<IActionResult> Lookup([FromBody] LookupBookingRequest request)
    {
        var reference = InputSanitizer.SingleLine(request.Reference).ToUpperInvariant();
        var email = InputSanitizer.SingleLine(request.Email).ToLowerInvariant();

        if (reference.Length == 0 || reference.Length > 12 || email.Length == 0 || email.Length > 254)
            return NotFound(new { message = "Booking not found." });

        var booking = await _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Barber)
            .FirstOrDefaultAsync(b => b.Reference == reference);

        if (booking is null ||
            !string.Equals(booking.CustomerEmail, email, StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(new { message = "Booking not found." });
        }

        var shopDto = await BookingMapper.ShopAsync(_db, _tenant.Id);
        return Ok(BookingMapper.ToResponse(booking, booking.Service, booking.Barber, shopDto));
    }

    // -------------------------------------------------------------------------

    /// <summary>
    /// Cryptographically secure, uniformly distributed reference codes
    /// (RandomNumberGenerator, not Random.Shared, so codes are unguessable).
    /// </summary>
    private async Task<string> GenerateReferenceAsync()
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var candidate = NewReferenceCandidate(6);
            if (!await _db.Bookings.AnyAsync(b => b.Reference == candidate))
                return candidate;
        }

        // Astronomically unlikely fallback: 8 crypto-random chars.
        return "CC-" + NewReferenceCandidate(8)["CC-".Length..];
    }

    /// <summary>Synchronous so stackalloc/Span stay out of the async path (C# 12).</summary>
    private static string NewReferenceCandidate(int length)
    {
        var bytes = new byte[length];
        RandomNumberGenerator.Fill(bytes);

        var chars = new char[length];
        for (var i = 0; i < length; i++)
        {
            // 256 % 32 == 0, so modulo introduces no bias.
            chars[i] = ReferenceAlphabet[bytes[i] % ReferenceAlphabet.Length];
        }

        return "CC-" + new string(chars);
    }
}
