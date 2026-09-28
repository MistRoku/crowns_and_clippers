using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CrownAndClipper.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace CrownAndClipper.Api.Security;

/// <summary>
/// Issues and configures JWT bearer tokens using the standard
/// Microsoft.IdentityModel JWT stack (HS256, issuer/audience/lifetime
/// validation) — no custom cryptography. A full ASP.NET Core Identity +
/// EF store was deliberately avoided: this API needs stateless JWTs only,
/// and the user/role/tenant model is a small custom schema. The signing
/// secret comes from the JWT_SECRET environment variable; a clearly-labelled
/// development fallback exists so local runs work without configuration,
/// and Program.cs refuses to start in Production without a real secret.
/// Key rotation: set a new JWT_SECRET value and restart — all existing
/// tokens invalidate at once (max 8 h of forced re-login by design).
/// </summary>
public class TokenService
{
    public const string Issuer = "crownclipper.auth";
    public const string Audience = "crownclipper.api";
    public const string DevSecret = "DEV-ONLY-SECRET-not-for-production-0123456789abcdef";

    public static string ClaimTenant = "tenant";
    public static string ClaimTenantSlug = "tenant_slug";
    public static string ClaimBarber = "barber";

    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;

    public TokenService(IConfiguration config, IHostEnvironment env)
    {
        _config = config;
        _env = env;
    }

    public string Secret => _config["JWT_SECRET"] ?? DevSecret;

    public bool UsingDevSecret => string.IsNullOrEmpty(_config["JWT_SECRET"]);

    public SecurityKey Key => new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret));

    public TokenValidationParameters ValidationParameters => new()
    {
        ValidateIssuer = true,
        ValidIssuer = Issuer,
        ValidateAudience = true,
        ValidAudience = Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = Key,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1),
    };

    /// <summary>8-hour token carrying user id, name, role and tenant binding.</summary>
    public string Issue(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role),
            new(ClaimTenant, user.TenantId.ToString()),
        };

        if (user.BarberId is int barberId)
        {
            claims.Add(new Claim(ClaimBarber, barberId.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(Key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

/// <summary>Convenience readers for the claims above.</summary>
public static class ClaimsReader
{
    public static int? UserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub)
                     ?? user.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : null;

    public static int? TenantId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(TokenService.ClaimTenant), out var id) ? id : null;

    public static int? BarberId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(TokenService.ClaimBarber), out var id) ? id : null;
}
