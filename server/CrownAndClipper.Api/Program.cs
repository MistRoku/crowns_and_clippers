using System.Threading.RateLimiting;
using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Middleware;
using CrownAndClipper.Api.Security;
using CrownAndClipper.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Hosts such as Render inject a PORT environment variable at runtime.
// Locally the API listens on http://localhost:5000 (see launchSettings.json).
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ---------------------------------------------------------------------------
// Kestrel hardening: bounded bodies, bounded timeouts, no Server header.
// ---------------------------------------------------------------------------
builder.WebHost.ConfigureKestrel(kestrel =>
{
    kestrel.Limits.MaxRequestBodySize = 64 * 1024;   // 64 KB is generous for our JSON payloads
    kestrel.Limits.MaxRequestLineSize = 8 * 1024;
    kestrel.Limits.KeepAliveTimeout = TimeSpan.FromSeconds(60);
    kestrel.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
    kestrel.AddServerHeader = false;
});

// ---------------------------------------------------------------------------
// Database (Entity Framework Core + SQLite - zero setup, file-based)
// ---------------------------------------------------------------------------
var connectionString = builder.Configuration.GetConnectionString("Default")
                       ?? "Data Source=crownclipper.db";

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

// ---------------------------------------------------------------------------
// Multi-tenancy + auth services
// ---------------------------------------------------------------------------
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddSingleton<TokenService>();

// Email transport: real SMTP when configured, otherwise the log/outbox
// transport keeps the whole reminder pipeline functional and inspectable.
builder.Services.AddSingleton<IEmailSender>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return string.IsNullOrWhiteSpace(config["SMTP:Host"])
        ? ActivatorUtilities.CreateInstance<LogEmailSender>(sp)
        : ActivatorUtilities.CreateInstance<SmtpEmailSender>(sp);
});
builder.Services.AddScoped<ReminderService>();
builder.Services.AddHostedService<ReminderWorker>();

var tokenServiceConfig = builder.Configuration;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Resolved lazily so configuration/env changes are picked up.
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = TokenService.Issuer,
            ValidateAudience = true,
            ValidAudience = TokenService.Audience,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var sp = ctx.HttpContext.RequestServices;
                var tokens = sp.GetRequiredService<TokenService>();
                ctx.Options.TokenValidationParameters.IssuerSigningKey = tokens.Key;
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

// ---------------------------------------------------------------------------
// API services
// ---------------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ---------------------------------------------------------------------------
// CORS - allow the React app (local dev + deployed Netlify URL) to call the API
// ---------------------------------------------------------------------------
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173" };

builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

// ---------------------------------------------------------------------------
// Reverse-proxy awareness: Render/Netlify edge proxies terminate TLS and
// forward the real client address. Without this, rate limiting would treat
// every customer as the proxy's IP.
// ---------------------------------------------------------------------------
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Platform-managed proxy tiers have dynamic addresses, so trust the chain.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ---------------------------------------------------------------------------
// Rate limiting: per-client-IP fixed windows.
// ---------------------------------------------------------------------------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"message\":\"Too many requests. Please wait a moment and try again.\"}",
            cancellationToken);
    };

    static string ClientIp(HttpContext ctx) =>
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 300,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));

    options.AddPolicy("booking", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromHours(1),
            QueueLimit = 0,
        }));

    options.AddPolicy("forms", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromHours(1),
            QueueLimit = 0,
        }));

    options.AddPolicy("lookup", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromHours(1),
            QueueLimit = 0,
        }));

    // Login/register: brute-force protection.
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromHours(1),
            QueueLimit = 0,
        }));
});

var app = builder.Build();

// Refuse to start in Production with the development JWT secret.
{
    var tokens = app.Services.GetRequiredService<TokenService>();
    if (app.Environment.IsProduction() && tokens.UsingDevSecret)
    {
        throw new InvalidOperationException(
            "JWT_SECRET environment variable is required in Production. Set a long random value.");
    }

    if (tokens.UsingDevSecret)
    {
        app.Logger.LogWarning("JWT_SECRET is not set: using the development-only signing key.");
    }
}

// ---------------------------------------------------------------------------
// Create the schema and seed tenants/catalogues/accounts on startup
// ---------------------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    DbSeeder.Seed(db);
}

// Real client IPs and scheme first, so rate limiting and logs are correct.
app.UseForwardedHeaders();

// Unhandled exceptions become a generic JSON 500 - no stack traces, no
// internals, and the exception is still written to the logs.
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    // BadHttpRequestException (oversized body/headers, malformed request)
    // keeps its own status code; everything else becomes a generic 500.
    var status = StatusCodes.Status500InternalServerError;
    if (context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error
        is BadHttpRequestException bad)
    {
        status = bad.StatusCode;
    }

    context.Response.StatusCode = status;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(status == StatusCodes.Status413PayloadTooLarge
        ? "{\"message\":\"The request is too large.\"}"
        : "{\"message\":\"An unexpected error occurred. Please try again.\"}");
}));

// Cheap early rejection of declared oversize bodies (chunked abuse is still
// caught by the Kestrel limit and mapped above).
app.Use(async (context, next) =>
{
    if (context.Request.ContentLength > 64 * 1024)
    {
        context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync("{\"message\":\"The request is too large.\"}");
        return;
    }

    await next();
});

// Tenant resolution must precede everything that touches scoped data.
app.UseTenantResolver();

app.UseRateLimiter();
app.UseSecurityHeaders();

// Swagger is a development convenience only - never exposed in production.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();

// A token issued for one tenant must never work on another tenant's data.
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var tenantContext = context.RequestServices.GetRequiredService<ITenantContext>();
        var tokenTenant = context.User.TenantId();
        if (tokenTenant is null || tokenTenant != tenantContext.Id)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                "{\"message\":\"Your session belongs to a different shop. Please sign in again here.\"}");
            return;
        }
    }

    await next();
});

app.UseAuthorization();

// Optional single-host deployment: if the built React app is copied into
// wwwroot, it is served from the same origin as the API.
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    time = DateTime.UtcNow
}));

// Public tenant directory (used by the shop switcher in the footer).
app.MapGet("/api/tenants", async (AppDbContext db) =>
{
    var tenants = await db.Tenants
        .IgnoreQueryFilters()
        .Where(t => t.Active)
        .OrderBy(t => t.IsDefault ? 0 : 1).ThenBy(t => t.Name)
        .Select(t => new { t.Slug, t.Name, t.Tagline, t.IsDefault })
        .ToListAsync();

    return Results.Ok(tenants);
});

// SPA fallback (only used when the React build is served from wwwroot).
app.MapFallbackToFile("index.html");

app.Run();
