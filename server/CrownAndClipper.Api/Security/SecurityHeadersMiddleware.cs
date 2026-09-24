using Microsoft.Extensions.Hosting;

namespace CrownAndClipper.Api.Security;

/// <summary>
/// Adds defence-in-depth response headers to every response:
/// nosniff, frame protection, referrer/permissions policies, COOP/CORP,
/// a Content-Security-Policy (strict for JSON endpoints, site policy for
/// pages served in single-host mode) and HSTS outside development.
/// </summary>
public sealed class SecurityHeadersMiddleware
{
    /// <summary>JSON API responses carry no content, so allow nothing.</summary>
    private const string ApiCsp =
        "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

    /// <summary>
    /// Policy for the built site when the API also serves wwwroot.
    /// Mirrors client/netlify.toml; keep the two in sync.
    /// </summary>
    private const string SiteCsp =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.onrender.com; " +
        "frame-src https://www.google.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";

    private readonly RequestDelegate _next;
    private readonly bool _development;

    public SecurityHeadersMiddleware(RequestDelegate next, IHostEnvironment environment)
    {
        _next = next;
        _development = environment.IsDevelopment();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";
        headers["Cross-Origin-Resource-Policy"] = "same-origin";

        var path = context.Request.Path;

        // Swagger UI (development only) needs a relaxed policy; skip CSP there.
        var isSwagger = _development && path.StartsWithSegments("/swagger");
        if (!isSwagger)
        {
            headers["Content-Security-Policy"] = path.StartsWithSegments("/api") ? ApiCsp : SiteCsp;
        }

        if (!_development)
        {
            headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains";
        }

        await _next(context);
    }
}

public static class SecurityHeadersExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
        => app.UseMiddleware<SecurityHeadersMiddleware>();
}
