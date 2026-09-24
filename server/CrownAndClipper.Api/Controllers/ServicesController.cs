using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

[ApiController]
[Route("api/services")]
public class ServicesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ServicesController(AppDbContext db) => _db = db;

    /// <summary>All services, ordered for display.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServiceDto>>> GetAll()
    {
        var services = await _db.Services
            .OrderBy(s => s.SortOrder)
            .Select(s => new ServiceDto(
                s.Id, s.Slug, s.Name, s.Description,
                s.Price, s.DurationMinutes, s.Category, s.IsPopular,
                s.Links.OrderBy(l => l.BarberId).Select(l => l.BarberId).ToArray()))
            .ToListAsync();

        return Ok(services);
    }

    /// <summary>A single service by slug (used by deep links such as /booking?service=skin-fade).</summary>
    [HttpGet("{slug}")]
    public async Task<ActionResult<ServiceDto>> GetBySlug(string slug)
    {
        var s = await _db.Services.FirstOrDefaultAsync(x => x.Slug == slug);
        if (s is null) return NotFound(new { message = "Service not found." });

        return Ok(new ServiceDto(s.Id, s.Slug, s.Name, s.Description,
            s.Price, s.DurationMinutes, s.Category, s.IsPopular,
            s.Links.OrderBy(l => l.BarberId).Select(l => l.BarberId).ToArray()));
    }
}
