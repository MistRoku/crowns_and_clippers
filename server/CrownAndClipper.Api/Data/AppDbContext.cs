using CrownAndClipper.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenant)
        : base(options)
    {
        _tenant = tenant;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Barber> Barbers => Set<Barber>();
    public DbSet<ServiceBarber> ServiceBarbers => Set<ServiceBarber>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<NewsletterSignup> NewsletterSignups => Set<NewsletterSignup>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ------------------------------------------------------------------
        // Multi-tenancy: global query filters. Every query against these sets
        // is automatically restricted to the resolved tenant; cross-tenant
        // reads are impossible without an explicit IgnoreQueryFilters().
        // NOTE: the tenant id must be read INSIDE each expression so EF
        // re-evaluates it per query (capturing it in a local would bake the
        // value from model-build time into the compiled model).
        // ------------------------------------------------------------------
        modelBuilder.Entity<User>().HasQueryFilter(u => u.TenantId == _tenant.Id);
        modelBuilder.Entity<Service>().HasQueryFilter(s => s.TenantId == _tenant.Id);
        modelBuilder.Entity<Barber>().HasQueryFilter(b => b.TenantId == _tenant.Id);
        modelBuilder.Entity<ServiceBarber>().HasQueryFilter(l => l.TenantId == _tenant.Id);
        modelBuilder.Entity<Booking>().HasQueryFilter(b => b.TenantId == _tenant.Id);
        modelBuilder.Entity<NewsletterSignup>().HasQueryFilter(n => n.TenantId == _tenant.Id);
        modelBuilder.Entity<ContactMessage>().HasQueryFilter(c => c.TenantId == _tenant.Id);

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasIndex(t => t.Slug).IsUnique();
            entity.Property(t => t.Slug).HasMaxLength(60);
            entity.Property(t => t.Name).HasMaxLength(120);
            entity.Property(t => t.Tagline).HasMaxLength(200);
            entity.Property(t => t.AddressLine).HasMaxLength(120);
            entity.Property(t => t.City).HasMaxLength(80);
            entity.Property(t => t.Postcode).HasMaxLength(20);
            entity.Property(t => t.Phone).HasMaxLength(32);
            entity.Property(t => t.Email).HasMaxLength(254);
            entity.Property(t => t.Timezone).HasMaxLength(60);
            entity.Property(t => t.OfferCode).HasMaxLength(40);
        });

        modelBuilder.Entity<User>(entity =>
        {
            // Emails are unique per tenant, not globally.
            entity.HasIndex(u => new { u.TenantId, u.Email }).IsUnique();
            entity.Property(u => u.Name).HasMaxLength(80);
            entity.Property(u => u.Email).HasMaxLength(254);
            entity.Property(u => u.PasswordHash).HasMaxLength(200);
            entity.Property(u => u.Role).HasMaxLength(20);
            entity.HasOne(u => u.Tenant).WithMany().HasForeignKey(u => u.TenantId);
            entity.HasOne(u => u.Barber).WithMany().HasForeignKey(u => u.BarberId);
        });

        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasIndex(s => new { s.TenantId, s.Slug }).IsUnique();
            // SQLite has no native decimal type; storing as double avoids
            // EF Core warnings while remaining exact enough for prices.
            entity.Property(s => s.Price).HasConversion<double>();
            entity.Property(s => s.Slug).HasMaxLength(60);
            entity.Property(s => s.Name).HasMaxLength(80);
            entity.Property(s => s.Description).HasMaxLength(500);
            entity.Property(s => s.Category).HasMaxLength(40);
            entity.HasOne(s => s.Tenant).WithMany().HasForeignKey(s => s.TenantId);
        });

        modelBuilder.Entity<Barber>(entity =>
        {
            entity.HasIndex(b => new { b.TenantId, b.Slug }).IsUnique();
            entity.Property(b => b.Slug).HasMaxLength(60);
            entity.Property(b => b.Name).HasMaxLength(80);
            entity.Property(b => b.Title).HasMaxLength(80);
            entity.Property(b => b.Bio).HasMaxLength(1000);
            entity.Property(b => b.Specialties).HasMaxLength(200);
            entity.Property(b => b.PhotoUrl).HasMaxLength(200);
            entity.HasOne(b => b.Tenant).WithMany().HasForeignKey(b => b.TenantId);
        });

        modelBuilder.Entity<ServiceBarber>(entity =>
        {
            entity.HasKey(l => new { l.ServiceId, l.BarberId });
            entity.HasIndex(l => l.TenantId);
            entity.HasOne(l => l.Service).WithMany(s => s.Links).HasForeignKey(l => l.ServiceId);
            entity.HasOne(l => l.Barber).WithMany(b => b.Links).HasForeignKey(l => l.BarberId);
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasIndex(b => b.Reference).IsUnique();
            entity.HasIndex(b => new { b.TenantId, b.BarberId, b.Date });
            // Backstop against double-booking races at the database level.
            // Filtered to confirmed bookings so cancelled slots free up again.
            entity.HasIndex(b => new { b.BarberId, b.Date, b.StartTime })
                .IsUnique()
                .HasFilter("\"Status\" = 'Confirmed'");
            entity.HasOne(b => b.Service).WithMany().HasForeignKey(b => b.ServiceId);
            entity.HasOne(b => b.Barber).WithMany().HasForeignKey(b => b.BarberId);
            entity.HasOne(b => b.Tenant).WithMany().HasForeignKey(b => b.TenantId);
            entity.HasOne(b => b.User).WithMany().HasForeignKey(b => b.UserId);
            entity.Property(b => b.Reference).HasMaxLength(12);
            entity.Property(b => b.CustomerName).HasMaxLength(80);
            entity.Property(b => b.CustomerEmail).HasMaxLength(254);
            entity.Property(b => b.CustomerPhone).HasMaxLength(32);
            entity.Property(b => b.Notes).HasMaxLength(500);
            entity.Property(b => b.Status).HasMaxLength(20);
        });

        modelBuilder.Entity<NewsletterSignup>(entity =>
        {
            entity.HasIndex(n => new { n.TenantId, n.Email }).IsUnique();
            entity.Property(n => n.Email).HasMaxLength(254);
            entity.Property(n => n.Source).HasMaxLength(60);
            entity.HasOne(n => n.Tenant).WithMany().HasForeignKey(n => n.TenantId);
        });

        modelBuilder.Entity<Notification>().HasQueryFilter(n => n.TenantId == _tenant.Id);

        modelBuilder.Entity<ContactMessage>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(80);
            entity.Property(c => c.Email).HasMaxLength(254);
            entity.Property(c => c.Phone).HasMaxLength(32);
            entity.Property(c => c.Subject).HasMaxLength(120);
            entity.Property(c => c.Message).HasMaxLength(2000);
            entity.HasOne(c => c.Tenant).WithMany().HasForeignKey(c => c.TenantId);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            // One row per (tenant, event, channel, target): reminders can run
            // every few minutes without ever duplicating a message.
            entity.HasIndex(n => new { n.TenantId, n.DedupeKey }).IsUnique();
            entity.HasIndex(n => new { n.TenantId, n.Status, n.Channel });
            entity.HasIndex(n => new { n.TenantId, n.UserId, n.ReadAtUtc });
            entity.HasOne(n => n.Tenant).WithMany().HasForeignKey(n => n.TenantId);
            entity.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId);
            entity.HasOne(n => n.Booking).WithMany().HasForeignKey(n => n.BookingId);
            entity.Property(n => n.Kind).HasMaxLength(40);
            entity.Property(n => n.Channel).HasMaxLength(20);
            entity.Property(n => n.RecipientName).HasMaxLength(80);
            entity.Property(n => n.RecipientEmail).HasMaxLength(254);
            entity.Property(n => n.Subject).HasMaxLength(200);
            entity.Property(n => n.Body).HasMaxLength(4000);
            entity.Property(n => n.Status).HasMaxLength(20);
            entity.Property(n => n.DedupeKey).HasMaxLength(400);
        });
    }
}
