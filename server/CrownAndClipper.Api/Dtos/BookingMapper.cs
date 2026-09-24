using CrownAndClipper.Api.Data;
using CrownAndClipper.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Dtos;

public record UserDto(
    int Id,
    string Name,
    string Email,
    string Role,
    int? BarberId,
    string? BarberName,
    string? BarberSlug,
    bool Active,
    string TenantSlug)
{
    public static UserDto From(User user, string tenantSlug) => new(
        user.Id,
        user.Name,
        user.Email,
        user.Role,
        user.BarberId,
        user.Barber?.Name,
        user.Barber?.Slug,
        user.Active,
        tenantSlug);
}

/// <summary>Maps entities to the booking response payload, tenant-aware.</summary>
public static class BookingMapper
{
    public static async Task<ShopDto> ShopAsync(AppDbContext db, int tenantId)
    {
        var t = await db.Tenants.FindAsync(tenantId);
        return FromTenant(t!);
    }

    public static ShopDto FromTenant(Tenant t) => new(
        t.Slug,
        t.Name,
        t.Tagline,
        t.AddressLine,
        t.City,
        t.Postcode,
        $"{t.AddressLine}, {t.City} {t.Postcode}",
        t.Phone,
        t.Email,
        t.Timezone,
        t.OfferCode,
        t.EstYear);

    public static BookingResponse ToResponse(Booking b, Service service, Barber barber, ShopDto shop) => new(
        b.Id,
        b.Reference,
        b.Status,
        b.Date.ToString("yyyy-MM-dd"),
        b.StartTime.ToString(@"hh\:mm"),
        b.EndTime.ToString(@"hh\:mm"),
        new BookingServiceDto(service.Id, service.Slug, service.Name, service.Price, service.DurationMinutes),
        new BookingBarberDto(barber.Id, barber.Slug, barber.Name, barber.Title, barber.PhotoUrl),
        new BookingCustomerDto(b.CustomerName, b.CustomerEmail, b.CustomerPhone),
        shop,
        b.Notes);
}
