using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Models;
using CrownAndClipper.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

/// <summary>
/// Stylist dashboard data: the signed-in stylist's own chair schedule.
/// Role-gated, and restricted to the barber row linked to the account.
/// </summary>
[ApiController]
[Route("api/staff")]
[Authorize(Roles = Roles.Stylist)]
public class StaffController : ControllerBase
{
    private readonly AppDbContext _db;

    public StaffController(AppDbContext db) => _db = db;

    [HttpGet("schedule")]
    public async Task<IActionResult> Schedule([FromQuery] string? date, [FromQuery] int days = 1)
    {
        var barberId = User.BarberId();
        if (barberId is null)
            return BadRequest(new { message = "This account isn't linked to a chair." });

        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var start))
            start = ShopClock.Today;

        days = Math.Clamp(days, 1, 14);
        var end = start.AddDays(days);

        var bookings = (await _db.Bookings
            .Include(b => b.Service)
            .Where(b => b.BarberId == barberId && b.Date >= start && b.Date < end)
            .ToListAsync())
            // SQLite cannot ORDER BY TimeSpan, so order the small result in memory.
            .OrderBy(b => b.Date)
            .ThenBy(b => b.StartTime)
            .ToList();

        return Ok(bookings.Select(b => new
        {
            reference = b.Reference,
            date = b.Date.ToString("yyyy-MM-dd"),
            startTime = b.StartTime.ToString(@"hh\:mm"),
            endTime = b.EndTime.ToString(@"hh\:mm"),
            service = b.Service.Name,
            customerName = b.CustomerName,
            status = b.Status,
        }));
    }
}
