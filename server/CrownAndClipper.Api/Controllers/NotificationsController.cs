using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

/// <summary>
/// In-app notification inbox for the signed-in user (customers and staff):
/// list, unread count for the header bell, and mark-as-read.
/// </summary>
[ApiController]
[Route("api/me/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = User.UserId();

        var items = await _db.Notifications
            .Where(n => n.UserId == userId && n.Channel == "InApp")
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(100)
            .Select(n => new
            {
                n.Id,
                n.Kind,
                n.Subject,
                n.Body,
                n.BookingId,
                createdAtUtc = n.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                readAtUtc = n.ReadAtUtc,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var userId = User.UserId();

        var count = await _db.Notifications
            .CountAsync(n => n.UserId == userId && n.Channel == "InApp" && n.ReadAtUtc == null);

        return Ok(new { count });
    }

    [HttpPost("read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User.UserId();
        var now = DateTime.UtcNow;

        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && n.Channel == "InApp" && n.ReadAtUtc == null)
            .ToListAsync();

        foreach (var n in unread) n.ReadAtUtc = now;
        await _db.SaveChangesAsync();

        return Ok(new { ok = true, updated = unread.Count });
    }
}
