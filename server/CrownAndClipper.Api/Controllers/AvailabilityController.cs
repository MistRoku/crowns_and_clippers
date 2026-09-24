using CrownAndClipper.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

[ApiController]
[Route("api")]
public class AvailabilityController : ControllerBase
{
    private readonly AppDbContext _db;

    public AvailabilityController(AppDbContext db) => _db = db;

    /// <summary>
    /// Time slots for a given date.
    /// - barberId omitted  -> slot is available if ANY barber is free
    /// - barberId supplied -> slot is available only if that barber is free
    /// - serviceId supplied -> slot length respects the service duration
    /// </summary>
    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] string? date,
        [FromQuery] int? barberId,
        [FromQuery] int? serviceId)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var d))
        {
            return BadRequest(new { message = "Please provide a date in yyyy-MM-dd format." });
        }

        var duration = 30;
        List<int>? qualifiedBarberIds = null;
        if (serviceId is not null)
        {
            var service = await _db.Services.FindAsync(serviceId.Value);
            if (service is null) return NotFound(new { message = "Service not found." });
            duration = service.DurationMinutes;

            qualifiedBarberIds = await _db.ServiceBarbers
                .Where(l => l.ServiceId == service.Id)
                .Select(l => l.BarberId)
                .ToListAsync();

            // A specific barber was requested but isn't qualified for this service.
            if (barberId is not null && !qualifiedBarberIds.Contains(barberId.Value))
            {
                var barber = await _db.Barbers.FindAsync(barberId.Value);
                return BadRequest(new
                {
                    message = $"{barber?.Name ?? "That stylist"} doesn't offer {service.Name}. Please choose a qualified stylist."
                });
            }
        }

        if (barberId is not null && !await _db.Barbers.AnyAsync(b => b.Id == barberId.Value))
        {
            return NotFound(new { message = "Barber not found." });
        }

        if (d < ShopClock.Today)
        {
            return Ok(new
            {
                date = d.ToString("yyyy-MM-dd"),
                closed = false,
                past = true,
                message = "That date has already passed.",
                slots = Array.Empty<object>()
            });
        }

        var hours = OpeningHours.ForDate(d);
        if (hours is null)
        {
            return Ok(new
            {
                date = d.ToString("yyyy-MM-dd"),
                closed = true,
                past = false,
                message = "We're closed on Sundays - see you Monday!",
                slots = Array.Empty<object>()
            });
        }

        var slots = OpeningHours.SlotsForDate(d, duration);

        var bookings = await _db.Bookings
            .Where(b => b.Date == d && b.Status == "Confirmed")
            .Select(b => new { b.BarberId, b.StartTime, b.EndTime })
            .ToListAsync();

        var barberIds = qualifiedBarberIds
            ?? await _db.Barbers.Select(b => b.Id).ToListAsync();

        var now = ShopClock.Now;
        var earliest = d == ShopClock.Today
            ? now.TimeOfDay + ShopClock.MinimumLeadTime
            : TimeSpan.Zero;

        var result = slots.Select(s =>
        {
            var e = s + TimeSpan.FromMinutes(duration);

            bool free;
            if (barberId is int bid)
            {
                free = !bookings.Any(b => b.BarberId == bid && b.StartTime < e && s < b.EndTime);
            }
            else
            {
                var busy = bookings
                    .Where(b => b.StartTime < e && s < b.EndTime)
                    .Select(b => b.BarberId)
                    .ToHashSet();
                free = barberIds.Any(id => !busy.Contains(id));
            }

            return new
            {
                time = s.ToString(@"hh\:mm"),
                available = s >= earliest && free
            };
        }).ToList();

        return Ok(new
        {
            date = d.ToString("yyyy-MM-dd"),
            closed = false,
            past = false,
            message = (string?)null,
            slots = result
        });
    }
}
