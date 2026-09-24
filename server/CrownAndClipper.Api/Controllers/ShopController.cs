using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Dtos;
using CrownAndClipper.Api.Models;
using CrownAndClipper.Api.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Controllers;

public record NewsletterRequest(string? Email, string? Source);

public record ContactRequest(string? Name, string? Email, string? Phone, string? Subject, string? Message);

[ApiController]
[Route("api")]
[RequestSizeLimit(64 * 1024)]
public class ShopController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public ShopController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    /// <summary>
    /// Business details + weekly opening hours for the frontend, for the
    /// resolved tenant (branding, address, phone, offer code, est. year).
    /// </summary>
    [HttpGet("shop")]
    public async Task<IActionResult> GetShop()
    {
        var tenant = await _db.Tenants.FindAsync(_tenant.Id);
        if (tenant is null) return NotFound(new { message = "Shop not found." });

        var shop = BookingMapper.FromTenant(tenant);
        return Ok(new
        {
            slug = shop.Slug,
            name = shop.Name,
            tagline = shop.Tagline,
            addressLine = shop.AddressLine,
            city = shop.City,
            postcode = shop.Postcode,
            fullAddress = shop.FullAddress,
            phone = shop.Phone,
            email = shop.Email,
            timezone = shop.Timezone,
            offerCode = shop.OfferCode,
            estYear = shop.EstYear,
            hours = OpeningHours.WeeklySchedule(),
        });
    }

    /// <summary>First-visit offer modal / footer newsletter form.</summary>
    [HttpPost("newsletter")]
    [EnableRateLimiting("forms")]
    public async Task<IActionResult> Newsletter([FromBody] NewsletterRequest request)
    {
        var email = InputSanitizer.SingleLine(request.Email).ToLowerInvariant();
        var source = InputSanitizer.SingleLine(request.Source);

        if (!InputSanitizer.IsValidEmail(email) || source.Length > 60)
            return BadRequest(new { message = "Please enter a valid email address." });

        var exists = await _db.NewsletterSignups.AnyAsync(n => n.Email == email);
        if (!exists)
        {
            _db.NewsletterSignups.Add(new NewsletterSignup
            {
                TenantId = _tenant.Id,
                Email = email,
                Source = string.IsNullOrWhiteSpace(source) ? "website" : source
            });
            await _db.SaveChangesAsync();
        }

        var tenant = await _db.Tenants.FindAsync(_tenant.Id);
        return Ok(new
        {
            ok = true,
            message = exists
                ? "You're already on the list - see you in the chair!"
                : $"You're on the list! Your code {tenant?.OfferCode ?? "WELCOME10"} is ready to use."
        });
    }

    /// <summary>Contact page form.</summary>
    [HttpPost("contact")]
    [EnableRateLimiting("forms")]
    public async Task<IActionResult> Contact([FromBody] ContactRequest request)
    {
        var name = InputSanitizer.SingleLine(request.Name);
        var email = InputSanitizer.SingleLine(request.Email).ToLowerInvariant();
        var phone = InputSanitizer.SingleLine(request.Phone);
        var subject = InputSanitizer.SingleLine(request.Subject);
        var message = InputSanitizer.MultiLine(request.Message);

        var errors = new List<string>();
        if (!InputSanitizer.IsValidName(name)) errors.Add("Please tell us your name.");
        if (!InputSanitizer.IsValidEmail(email)) errors.Add("Please provide a valid email address.");
        if (message.Length < 10) errors.Add("Please write a message (at least 10 characters).");
        if (message.Length > 2000) errors.Add("Messages must be under 2000 characters.");
        if (subject.Length > 120) errors.Add("Subjects must be under 120 characters.");
        if (phone.Length > 0 && !InputSanitizer.IsValidPhone(phone))
            errors.Add("Please provide a valid phone number.");
        if (errors.Count > 0) return BadRequest(new { message = string.Join(" ", errors) });

        _db.ContactMessages.Add(new ContactMessage
        {
            TenantId = _tenant.Id,
            Name = name,
            Email = email,
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone,
            Subject = string.IsNullOrWhiteSpace(subject) ? null : subject,
            Message = message
        });
        await _db.SaveChangesAsync();

        return Accepted(new
        {
            ok = true,
            message = "Thanks for reaching out - we'll get back to you within one business day."
        });
    }
}
