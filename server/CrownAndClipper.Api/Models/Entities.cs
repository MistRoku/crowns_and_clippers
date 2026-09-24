namespace CrownAndClipper.Api.Models;

/// <summary>
/// A tenant: one barbershop business on the platform, with its own branding,
/// catalogue, staff, bookings and users. All tenant-scoped rows carry TenantId
/// and the DbContext applies global query filters so data never leaks across
/// tenants.
/// </summary>
public class Tenant
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string Tagline { get; set; } = "";
    public string AddressLine { get; set; } = "";
    public string City { get; set; } = "";
    public string Postcode { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public string Timezone { get; set; } = "Africa/Johannesburg";
    public string OfferCode { get; set; } = "";
    public int EstYear { get; set; }
    public bool IsDefault { get; set; }
    public bool Active { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>Application roles, evaluated per tenant.</summary>
public static class Roles
{
    public const string Customer = "Customer";
    public const string Stylist = "Stylist";
    public const string Admin = "Admin";
    public static readonly string[] All = { Customer, Stylist, Admin };
}

/// <summary>
/// A user account, scoped to one tenant. Stylists link to their Barber row so
/// the staff dashboard knows whose schedule to show.
/// </summary>
public class User
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    /// <summary>PBKDF2 hash in the form v1$base64(salt)$base64(subkey).</summary>
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = Roles.Customer;
    public int? BarberId { get; set; }
    public Barber? Barber { get; set; }
    public bool Active { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>A grooming service offered by the shop.</summary>
public class Service
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
    /// <summary>Cuts | Beard &amp; Shave | Packages | Kids &amp; Students</summary>
    public string Category { get; set; } = "Cuts";
    public bool IsPopular { get; set; }
    public int SortOrder { get; set; }

    /// <summary>Which staff members are qualified to deliver this service.</summary>
    public List<ServiceBarber> Links { get; set; } = new();
}

/// <summary>A barber working at the shop.</summary>
public class Barber
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string Title { get; set; } = "";
    public string Bio { get; set; } = "";
    /// <summary>Comma-separated list, e.g. "Skin fades, Beard sculpting".</summary>
    public string Specialties { get; set; } = "";
    public string PhotoUrl { get; set; } = "";
    public int YearsExperience { get; set; }
    public int SortOrder { get; set; }

    /// <summary>Services this staff member is qualified to deliver.</summary>
    public List<ServiceBarber> Links { get; set; } = new();
}

/// <summary>
/// Join table linking services to the barbers/stylists qualified to perform
/// them (e.g. box braids are only bookable with the braiding specialist).
/// </summary>
public class ServiceBarber
{
    public int TenantId { get; set; }
    public int ServiceId { get; set; }
    public Service Service { get; set; } = null!;
    public int BarberId { get; set; }
    public Barber Barber { get; set; } = null!;
}

/// <summary>A confirmed customer appointment.</summary>
public class Booking
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    /// <summary>Human-friendly reference, e.g. CC-K7XQ2M.</summary>
    public string Reference { get; set; } = "";

    public int ServiceId { get; set; }
    public Service Service { get; set; } = null!;

    public int BarberId { get; set; }
    public Barber Barber { get; set; } = null!;

    public DateOnly Date { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }

    public string CustomerName { get; set; } = "";
    public string CustomerEmail { get; set; } = "";
    public string CustomerPhone { get; set; } = "";
    public string? Notes { get; set; }

    /// <summary>Set when the booking was made by a signed-in customer.</summary>
    public int? UserId { get; set; }
    public User? User { get; set; }

    public string Status { get; set; } = "Confirmed";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>Email captured by the first-visit offer modal / newsletter form.</summary>
public class NewsletterSignup
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string Email { get; set; } = "";
    public string? Source { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>Message submitted through the contact form.</summary>
public class ContactMessage
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string? Subject { get; set; }
    public string Message { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>Notification kinds driven by the reminder scheduler and booking events.</summary>
public static class NotificationKinds
{
    public const string BookingConfirmed = "BookingConfirmed";
    public const string BookingCancelled = "BookingCancelled";
    public const string ClientReminder24h = "ClientReminder24h";
    public const string ClientReminder2h = "ClientReminder2h";
    public const string StaffReminder2h = "StaffReminder2h";
    public const string StaffDayAhead = "StaffDayAhead";
}

public static class NotificationChannels
{
    public const string Email = "Email";
    public const string InApp = "InApp";
}

public static class NotificationStatuses
{
    public const string Pending = "Pending";   // email waiting for dispatch
    public const string Sent = "Sent";         // delivered (email sent / inbox delivered)
    public const string Failed = "Failed";     // gave up after retries
}

/// <summary>
/// One notification message for one recipient on one channel. Email rows flow
/// through the outbox (Pending -> Sent/Failed with retries); InApp rows are
/// delivered to the recipient's inbox immediately and track ReadAtUtc.
/// DedupeKey makes reminder generation idempotent across scheduler cycles.
/// </summary>
public class Notification
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    /// <summary>Set when the recipient has an account (drives the in-app bell).</summary>
    public int? UserId { get; set; }
    public User? User { get; set; }

    public int? BookingId { get; set; }
    public Booking? Booking { get; set; }

    public string Kind { get; set; } = "";
    public string Channel { get; set; } = NotificationChannels.Email;
    public string RecipientName { get; set; } = "";
    public string RecipientEmail { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";

    public string Status { get; set; } = NotificationStatuses.Pending;
    public int Attempts { get; set; }
    public string DedupeKey { get; set; } = "";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? SentAtUtc { get; set; }
    public DateTime? ReadAtUtc { get; set; }
}
