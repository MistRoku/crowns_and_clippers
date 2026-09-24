using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

[ApiController]
[Route("api/barbers")]
public class BarbersController : ControllerBase
{
    private readonly AppDbContext _db;

    public BarbersController(AppDbContext db) => _db = db;

    /// <summary>All barbers, ordered for display.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BarberDto>>> GetAll()
    {
        var barbers = await _db.Barbers
            .OrderBy(b => b.SortOrder)
            .Select(b => new BarberDto(
                b.Id, b.Slug, b.Name, b.Title, b.Bio,
                b.Specialties.Split(',', StringSplitOptions.TrimEntries),
                b.PhotoUrl, b.YearsExperience))
            .ToListAsync();

        return Ok(barbers);
    }
}
