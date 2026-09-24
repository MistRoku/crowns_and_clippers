using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Dtos;
using CrownAndClipper.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

/// <summary>Signed-in customer area: own bookings, own cancellations.</summary>
[ApiController]
[Route("api/me")]
[Authorize]
public class MeController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly Services.ReminderService _reminders;

    public MeController(AppDbContext db, ITenantContext tenant, Services.ReminderService reminders)
    {
        _db = db;
        _tenant = tenant;
        _reminders = reminders;
    }

    /// <summary>Bookings made while signed in, plus guest bookings by email.</summary>
    [HttpGet("bookings")]
    public async Task<IActionResult> MyBookings()
    {
        var userId = User.UserId();
        var email = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value
                    ?? "";

        var bookings = (await _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Barber)
            .Where(b => b.UserId == userId || (b.UserId == null && b.CustomerEmail == email))
            .ToListAsync())
            // SQLite cannot ORDER BY TimeSpan, so order the small result in memory.
            .OrderByDescending(b => b.Date)
            .ThenBy(b => b.StartTime)
            .ToList();

        var shop = await BookingMapper.ShopAsync(_db, _tenant.Id);
        return Ok(bookings.Select(b => BookingMapper.ToResponse(b, b.Service, b.Barber, shop)));
    }

    /// <summary>
    /// Cancel own booking. Allowed up to 24 hours before the start time
    /// (the shop's published policy); inside that window customers must call.
    /// </summary>
    [HttpPost("bookings/{reference}/cancel")]
    public async Task<IActionResult> Cancel(string reference)
    {
        var userId = User.UserId();
        var cleanRef = InputSanitizer.SingleLine(reference).ToUpperInvariant();

        var booking = await _db.Bookings
            .Include(b => b.Service)
            .FirstOrDefaultAsync(b => b.Reference == cleanRef && b.UserId == userId);

        if (booking is null) return NotFound(new { message = "Booking not found." });
        if (booking.Status != "Confirmed")
            return BadRequest(new { message = "This booking is already cancelled." });

        var zone = ShopClock.Zone;
        var startLocal = booking.Date.ToDateTime(TimeOnly.FromTimeSpan(booking.StartTime));
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);

        if (startLocal - nowLocal < TimeSpan.FromHours(24))
        {
            return BadRequest(new
            {
                message = "Bookings inside 24 hours can't be cancelled online. Please call the shop."
            });
        }

        booking.Status = "Cancelled";
        await _db.SaveChangesAsync();

        var tenant = await _db.Tenants.FindAsync(_tenant.Id);
        if (tenant is not null)
        {
            await _reminders.BookingCancelledAsync(tenant, booking);
        }

        return Ok(new { ok = true, message = "Your booking has been cancelled." });
    }
}
