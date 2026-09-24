using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Dtos;
using CrownAndClipper.Api.Models;
using CrownAndClipper.Api.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

public record RegisterRequest(string? Name, string? Email, string? Password);
public record LoginRequest(string? Email, string? Password);

[ApiController]
[Route("api/auth")]
[RequestSizeLimit(64 * 1024)]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly TokenService _tokens;

    public AuthController(AppDbContext db, ITenantContext tenant, TokenService tokens)
    {
        _db = db;
        _tenant = tenant;
        _tokens = tokens;
    }

    /// <summary>
    /// Self-service customer registration, scoped to the current tenant.
    /// Staff and admin accounts are seeded or created by an admin.
    /// </summary>
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var name = InputSanitizer.SingleLine(request.Name);
        var email = InputSanitizer.SingleLine(request.Email).ToLowerInvariant();
        var password = request.Password ?? "";

        var errors = new List<string>();
        if (!InputSanitizer.IsValidName(name)) errors.Add("Please tell us your full name.");
        if (!InputSanitizer.IsValidEmail(email)) errors.Add("Please provide a valid email address.");
        if (password.Length < 10 || password.Length > 128)
            errors.Add("Passwords must be 10-128 characters.");
        if (errors.Count > 0) return BadRequest(new { message = string.Join(" ", errors) });

        // Query filters scope this to the current tenant automatically.
        if (await _db.Users.AnyAsync(u => u.Email == email))
        {
            return Conflict(new { message = "An account with this email already exists in this shop. Try signing in." });
        }

        var user = new User
        {
            TenantId = _tenant.Id,
            Name = name,
            Email = email,
            PasswordHash = PasswordHasher.Hash(password),
            Role = Roles.Customer,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Created("/api/auth/me", AuthPayload(user));
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = InputSanitizer.SingleLine(request.Email).ToLowerInvariant();
        var password = request.Password ?? "";

        // Identical error for unknown email, wrong password and disabled
        // accounts: no account-existence oracle.
        var user = await _db.Users
            .Include(u => u.Barber)
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !user.Active || !PasswordHasher.Verify(password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Email or password is incorrect." });
        }

        return Ok(AuthPayload(user));
    }

    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> Me()
    {
        var id = User.UserId();
        var user = id is null ? null : await _db.Users.Include(u => u.Barber).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return Unauthorized(new { message = "Session expired. Please sign in again." });

        return Ok(UserDto.From(user, _tenant.Slug));
    }

    private object AuthPayload(User user) => new
    {
        token = _tokens.Issue(user),
        user = UserDto.From(user, _tenant.Slug),
    };
}
