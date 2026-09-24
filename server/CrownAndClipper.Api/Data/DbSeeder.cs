using CrownAndClipper.Api.Models;
using CrownAndClipper.Api.Security;
using Microsoft.EntityFrameworkCore;

namespace CrownAndClipper.Api.Data;

/// <summary>
/// Seeds tenants, per-tenant catalogues, qualification links and starter
/// accounts. Idempotent and incremental: existing rows are left untouched,
/// missing slugs/links/users are added on startup.
/// </summary>
public static class DbSeeder
{
    private record ServiceDef(Service Service, string[] BarberSlugs);
    private record UserDef(string Name, string Email, string Password, string Role, string? BarberSlug);
    private record TenantDef(Tenant Tenant, ServiceDef[] Services, Barber[] Barbers, UserDef[] Users);

    // Documented starter passwords (change them after first login in production).
    public const string AdminSeedPassword = "ChangeMe!2024";
    public const string StylistSeedPassword = "Stylist!2024";

    public static void Seed(AppDbContext db)
    {
        var defs = BuildDefs();

        // ---- Tenants -------------------------------------------------------
        foreach (var def in defs)
        {
            if (!db.Tenants.IgnoreQueryFilters().Any(t => t.Slug == def.Tenant.Slug))
            {
                db.Tenants.Add(def.Tenant);
            }
        }

        db.SaveChanges();

        foreach (var def in defs)
        {
            var tenant = db.Tenants.IgnoreQueryFilters().First(t => t.Slug == def.Tenant.Slug);

            // ---- Staff -----------------------------------------------------
            foreach (var barber in def.Barbers)
            {
                if (!db.Barbers.IgnoreQueryFilters().Any(b => b.TenantId == tenant.Id && b.Slug == barber.Slug))
                {
                    barber.TenantId = tenant.Id;
                    db.Barbers.Add(barber);
                }
            }

            // ---- Services ----------------------------------------------------
            foreach (var serviceDef in def.Services)
            {
                if (!db.Services.IgnoreQueryFilters().Any(s => s.TenantId == tenant.Id && s.Slug == serviceDef.Service.Slug))
                {
                    serviceDef.Service.TenantId = tenant.Id;
                    db.Services.Add(serviceDef.Service);
                }
            }

            // ---- Users ---------------------------------------------------------
            // Save first so the barber lookups below see persisted rows.
            db.SaveChanges();

            foreach (var userDef in def.Users)
            {
                if (!db.Users.IgnoreQueryFilters().Any(u => u.TenantId == tenant.Id && u.Email == userDef.Email))
                {
                    db.Users.Add(new User
                    {
                        TenantId = tenant.Id,
                        Name = userDef.Name,
                        Email = userDef.Email,
                        PasswordHash = PasswordHasher.Hash(userDef.Password),
                        Role = userDef.Role,
                        BarberId = userDef.BarberSlug is null
                            ? null
                            : db.Barbers.IgnoreQueryFilters()
                                .First(b => b.TenantId == tenant.Id && b.Slug == userDef.BarberSlug).Id,
                    });
                }
            }

            db.SaveChanges();

            // ---- Qualification links -------------------------------------------
            foreach (var serviceDef in def.Services)
            {
                var service = db.Services.IgnoreQueryFilters()
                    .First(s => s.TenantId == tenant.Id && s.Slug == serviceDef.Service.Slug);

                foreach (var slug in serviceDef.BarberSlugs)
                {
                    var barber = db.Barbers.IgnoreQueryFilters()
                        .First(b => b.TenantId == tenant.Id && b.Slug == slug);

                    if (!db.ServiceBarbers.IgnoreQueryFilters().Any(l => l.ServiceId == service.Id && l.BarberId == barber.Id))
                    {
                        db.ServiceBarbers.Add(new ServiceBarber
                        {
                            TenantId = tenant.Id,
                            ServiceId = service.Id,
                            BarberId = barber.Id,
                        });
                    }
                }
            }

            db.SaveChanges();
        }
    }

    // -------------------------------------------------------------------------

    private static List<TenantDef> BuildDefs() => new()
    {
        // ================= Tenant 1: Crown & Clipper (default) =================
        new TenantDef(
            new Tenant
            {
                Slug = "crown-and-clipper",
                Name = "Crown & Clipper Barber Co.",
                Tagline = "Sharp cuts. Timeless style.",
                AddressLine = "44 Stanley Avenue, Milpark",
                City = "Johannesburg",
                Postcode = "2092",
                Phone = "+27 11 555 0142",
                Email = "hello@crownandclipper.co.za",
                Timezone = "Africa/Johannesburg",
                OfferCode = "FIRSTCUT10",
                EstYear = 2014,
                IsDefault = true,
            },
            new[]
            {
                Svc("classic-cut", "Classic Cut", "Cuts", "A precision scissor or clipper cut tailored to you, finished with a wash, style and product of your choice.", 240m, 30, true, 1, new[] { "marcus-reid", "sofia-karim", "danny-okafor", "tommy-vance" }),
                Svc("skin-fade", "Skin Fade", "Cuts", "A razor-sharp zero-gap fade blended seamlessly into a styled top. Our most requested cut.", 300m, 45, true, 2, new[] { "marcus-reid", "sofia-karim", "danny-okafor", "tommy-vance" }),
                Svc("beard-sculpt", "Beard Sculpt & Trim", "Beard & Shave", "Shape-up, line-up and full beard trim with clippers and scissors, finished with beard oil.", 180m, 30, false, 3, new[] { "marcus-reid", "sofia-karim", "danny-okafor" }),
                Svc("hot-towel-shave", "Hot Towel Royal Shave", "Beard & Shave", "A traditional straight-razor shave with hot towels, pre-shave oil and a soothing aftershave balm.", 350m, 45, false, 4, new[] { "marcus-reid", "sofia-karim" }),
                Svc("cut-and-beard", "Cut & Beard Combo", "Packages", "Any haircut paired with a full beard sculpt - the complete refresh in one chair visit.", 450m, 60, true, 5, new[] { "marcus-reid", "sofia-karim", "danny-okafor" }),
                Svc("the-full-works", "The Full Works", "Packages", "Our signature experience: haircut, beard sculpt, hot-towel shave finish, wash and style. Coffee or whisky included.", 650m, 90, false, 6, new[] { "marcus-reid", "sofia-karim" }),
                Svc("kids-cut", "Kids Cut (Under 12)", "Kids & Students", "Patient, friendly haircuts for our youngest clients - booster seats, cartoons and lollipops on standby.", 150m, 30, false, 7, new[] { "danny-okafor", "tommy-vance" }),
                Svc("student-cut", "Student Cut", "Kids & Students", "Any classic style at a student-friendly price. Just bring a valid student ID on the day.", 180m, 30, false, 8, new[] { "sofia-karim", "danny-okafor", "tommy-vance" }),
                Svc("box-braids", "Box Braids", "Braids & Styles", "Knotless or classic box braids, installed neatly with care for your edges and finished with a shine serum.", 850m, 150, true, 9, new[] { "amara-mensah" }),
                Svc("cornrows", "Cornrows", "Braids & Styles", "Straight-back or freestyle cornrows, plaited crisp and even, finished with edge control.", 450m, 90, false, 10, new[] { "amara-mensah", "danny-okafor" }),
                Svc("two-strand-twists", "Two-Strand Twists", "Braids & Styles", "Defined two-strand twists on natural hair, with a wash and condition on request.", 550m, 120, false, 11, new[] { "amara-mensah", "danny-okafor" }),
                Svc("loc-retwist", "Loc Retwist & Style", "Braids & Styles", "A neat retwist for locs at any stage, styled and set so they hold for weeks.", 500m, 90, false, 12, new[] { "amara-mensah" }),
                Svc("silk-press", "Silk Press & Blowout", "Braids & Styles", "Wash, blowout and silk press with heat protectant: smooth movement without chemical relaxers.", 600m, 90, false, 13, new[] { "amara-mensah" }),
            },
            new[]
            {
                Barber("marcus-reid", "Marcus Reid", "Master Barber & Founder", "Marcus opened Crown & Clipper in 2014 after a decade in London's Savile Row shops before coming home to Johannesburg. He blends old-school scissor craft with modern finishes, and still gives the sharpest straight-razor shave in the city.", "Classic cuts, Scissor work, Straight-razor shaves", "/images/barbers/marcus-reid.jpg", 18, 1),
                Barber("sofia-karim", "Sofia Karim", "Senior Barber", "Sofia is our fade perfectionist - her skin fades and beard sculpts are geometric works of art. She keeps a loyal books-only clientele and mentors our junior barbers.", "Skin fades, Beard sculpting, Modern styles", "/images/barbers/sofia-karim.jpg", 11, 2),
                Barber("danny-okafor", "Danny Okafor", "Barber", "Danny specialises in afro and textured hair - twists, waves and crisp line-ups. His chair is the loudest in the shop, in the best possible way.", "Afro & textured hair, Twists, Sharp line-ups", "/images/barbers/danny-okafor.jpg", 7, 3),
                Barber("tommy-vance", "Tommy Vance", "Barber", "Tommy joined us fresh from barber college and never looked back. Calm with kids, quick with clippers, and the reason our crops and textured styles stay on trend.", "Kids cuts, Crops, Fades", "/images/barbers/tommy-vance.jpg", 4, 4),
                Barber("amara-mensah", "Amara Mensah", "Hair Stylist · Braiding & Locs", "Amara leads our braiding chair: box braids, cornrows, locs and silk presses installed with patience and precision. Her books fill weeks ahead, so plan early.", "Box braids, Cornrows, Locs, Silk press", "/images/barbers/amara-mensah.jpg", 9, 5),
            },
            new[]
            {
                new UserDef("Marcus Reid", "admin@crownandclipper.co.za", AdminSeedPassword, Roles.Admin, "marcus-reid"),
                new UserDef("Marcus Reid", "marcus.reid@crownandclipper.co.za", StylistSeedPassword, Roles.Stylist, "marcus-reid"),
                new UserDef("Sofia Karim", "sofia.karim@crownandclipper.co.za", StylistSeedPassword, Roles.Stylist, "sofia-karim"),
                new UserDef("Danny Okafor", "danny.okafor@crownandclipper.co.za", StylistSeedPassword, Roles.Stylist, "danny-okafor"),
                new UserDef("Tommy Vance", "tommy.vance@crownandclipper.co.za", StylistSeedPassword, Roles.Stylist, "tommy-vance"),
                new UserDef("Amara Mensah", "amara.mensah@crownandclipper.co.za", StylistSeedPassword, Roles.Stylist, "amara-mensah"),
            }),

        // ================= Tenant 2: Velvet Fades (demo second shop) =================
        new TenantDef(
            new Tenant
            {
                Slug = "velvet-fades",
                Name = "Velvet Fades Barber Studio",
                Tagline = "Bold fades, bold people.",
                AddressLine = "88 Oxford Road, Rosebank",
                City = "Johannesburg",
                Postcode = "2196",
                Phone = "+27 11 555 0200",
                Email = "book@velvetfades.co.za",
                Timezone = "Africa/Johannesburg",
                OfferCode = "VELVET10",
                EstYear = 2019,
                IsDefault = false,
            },
            new[]
            {
                Svc("velvet-fade", "The Velvet Fade", "Cuts", "Our signature mid-or-high fade with a textured top and razor finish.", 320m, 45, true, 1, new[] { "rio-callum", "nadia-brooks" }),
                Svc("beard-line-up", "Beard Line-Up", "Beard & Shave", "Crisp edges, cheek line and neckline tidy with hot towel finish.", 150m, 20, false, 2, new[] { "rio-callum", "nadia-brooks" }),
                Svc("kids-fade", "Kids Fade (Under 12)", "Kids & Students", "Gentle first fades with patience, stickers and a lollipop at the end.", 180m, 30, false, 3, new[] { "nadia-brooks" }),
            },
            new[]
            {
                Barber("rio-callum", "Rio Callum", "Barber & Founder", "Rio opened Velvet Fades in 2019 with one chair and a clipper-over-comb obsession. Still the fastest fade on Oxford Road.", "Fades, Design work, Razor work", "/images/barbers/marcus-reid.jpg", 12, 1),
                Barber("nadia-brooks", "Nadia Brooks", "Barber", "Nadia keeps the studio's kids' chair calm and its fades crisp. Texture specialist.", "Kids cuts, Textured crops, Fades", "/images/barbers/sofia-karim.jpg", 6, 2),
            },
            new[]
            {
                new UserDef("Rio Callum", "admin@velvetfades.co.za", AdminSeedPassword, Roles.Admin, "rio-callum"),
                new UserDef("Rio Callum", "rio.callum@velvetfades.co.za", StylistSeedPassword, Roles.Stylist, "rio-callum"),
                new UserDef("Nadia Brooks", "nadia.brooks@velvetfades.co.za", StylistSeedPassword, Roles.Stylist, "nadia-brooks"),
            }),
    };

    private static ServiceDef Svc(string slug, string name, string category, string description,
        decimal price, int minutes, bool popular, int sort, string[] barbers) =>
        new(new Service
        {
            Slug = slug,
            Name = name,
            Category = category,
            Description = description,
            Price = price,
            DurationMinutes = minutes,
            IsPopular = popular,
            SortOrder = sort,
        }, barbers);

    private static Barber Barber(string slug, string name, string title, string bio,
        string specialties, string photo, int years, int sort) =>
        new()
        {
            Slug = slug,
            Name = name,
            Title = title,
            Bio = bio,
            Specialties = specialties,
            PhotoUrl = photo,
            YearsExperience = years,
            SortOrder = sort,
        };
}
