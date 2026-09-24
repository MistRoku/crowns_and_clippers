namespace CrownAndClipper.Api.Dtos;

public record ServiceDto(
    int Id, string Slug, string Name, string Description,
    decimal Price, int DurationMinutes, string Category, bool IsPopular,
    int[] BarberIds);

public record BarberDto(
    int Id, string Slug, string Name, string Title, string Bio,
    string[] Specialties, string PhotoUrl, int YearsExperience);

/// <summary>Tenant branding + contact details, served by GET /api/shop.</summary>
public record ShopDto(
    string Slug,
    string Name,
    string Tagline,
    string AddressLine,
    string City,
    string Postcode,
    string FullAddress,
    string Phone,
    string Email,
    string Timezone,
    string OfferCode,
    int EstYear);

public record BookingServiceDto(int Id, string Slug, string Name, decimal Price, int DurationMinutes);

public record BookingBarberDto(int Id, string Slug, string Name, string Title, string PhotoUrl);

public record BookingCustomerDto(string Name, string Email, string Phone);

public record BookingResponse(
    int Id,
    string Reference,
    string Status,
    string Date,
    string StartTime,
    string EndTime,
    BookingServiceDto Service,
    BookingBarberDto Barber,
    BookingCustomerDto Customer,
    ShopDto Shop,
    string? Notes);
