using CrownAndClipper.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CrownAndClipper.Api.Middleware;

/// <summary>
/// Resolves the tenant for every request, in priority order:
///   1. Subdomain            velvet-fades.example.com  -> tenant "velvet-fades"
///   2. X-Tenant-Slug header (used by the SPA's shop switcher / API clients)
///   3. The default tenant   (apex domain, no header)
/// Inactive or unknown tenants fall back to the default rather than erroring,
/// except an explicit header/subdomain match that is inactive -> 404.
/// </summary>
public sealed class TenantResolverMiddleware
{
    private static readonly MemoryCache Cache = new(new MemoryCacheOptions());

    private readonly RequestDelegate _next;

    public TenantResolverMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, IServiceScopeFactory scopeFactory)
    {
        var requestedSlug = ResolveRequestedSlug(context);

        var tenants = await GetTenantsAsync(scopeFactory);

        Models.Tenant? tenant = null;
        if (requestedSlug is not null)
        {
            tenant = tenants.FirstOrDefault(t =>
                string.Equals(t.Slug, requestedSlug, StringComparison.OrdinalIgnoreCase));

            if (tenant is { Active: false })
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"message\":\"This shop is not available.\"}");
                return;
            }
        }

        tenant ??= tenants.FirstOrDefault(t => t.IsDefault) ?? tenants.FirstOrDefault();

        if (tenant is null)
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"message\":\"No tenant configured.\"}");
            return;
        }

        tenantContext.Set(tenant.Id, tenant.Slug);
        await _next(context);
    }

    /// <summary>Subdomain first, then the explicit header.</summary>
    private static string? ResolveRequestedSlug(HttpContext context)
    {
        var host = context.Request.Host.Host;

        // velvet-fades.localhost / velvet-fades.example.com / *.example.com
        if (!host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            && !System.Net.IPAddress.TryParse(host, out _))
        {
            var parts = host.Split('.');
            var isLocalhostDomain = host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase);
            if ((parts.Length > 2 || isLocalhostDomain) && parts[0] is { Length: > 0 } label
                && !label.Equals("www", StringComparison.OrdinalIgnoreCase))
            {
                return label;
            }
        }

        if (context.Request.Headers.TryGetValue("X-Tenant-Slug", out var headerSlug)
            && !string.IsNullOrWhiteSpace(headerSlug))
        {
            return headerSlug.ToString().Trim();
        }

        return null;
    }

    /// <summary>Tenant table, cached for a minute (tiny, rarely changes).</summary>
    private static async Task<IReadOnlyList<Models.Tenant>> GetTenantsAsync(IServiceScopeFactory scopeFactory)
    {
        if (Cache.TryGetValue("tenants", out IReadOnlyList<Models.Tenant>? cached) && cached is not null)
        {
            return cached;
        }

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tenants = await db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .ToListAsync();

        Cache.Set("tenants", tenants, TimeSpan.FromMinutes(1));
        return tenants;
    }
}

public static class TenantResolverExtensions
{
    public static IApplicationBuilder UseTenantResolver(this IApplicationBuilder app)
        => app.UseMiddleware<TenantResolverMiddleware>();
}
