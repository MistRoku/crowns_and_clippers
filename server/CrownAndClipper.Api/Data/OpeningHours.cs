namespace CrownAndClipper.Api.Data;

/// <summary>
/// All "current time" logic for the shop, expressed in the shop's own
/// time zone (Africa/Johannesburg, SAST) - never the server's local time.
/// </summary>
public static class ShopClock
{
    public static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById("Africa/Johannesburg"); // SAST, no DST

    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zone);

    public static DateOnly Today => DateOnly.FromDateTime(Now);

    /// <summary>Bookings must be made at least this far in advance.</summary>
    public static readonly TimeSpan MinimumLeadTime = TimeSpan.FromMinutes(60);
}

/// <summary>Opening hours and 30-minute slot generation.</summary>
public static class OpeningHours
{
    public static readonly TimeSpan SlotStep = TimeSpan.FromMinutes(30);

    /// <summary>Returns (open, close) for the date, or null when the shop is closed.</summary>
    public static (TimeSpan Open, TimeSpan Close)? ForDate(DateOnly date) => date.DayOfWeek switch
    {
        DayOfWeek.Monday    => (new TimeSpan(9, 0, 0), new TimeSpan(19, 0, 0)),
        DayOfWeek.Tuesday   => (new TimeSpan(9, 0, 0), new TimeSpan(19, 0, 0)),
        DayOfWeek.Wednesday => (new TimeSpan(9, 0, 0), new TimeSpan(19, 0, 0)),
        DayOfWeek.Thursday  => (new TimeSpan(9, 0, 0), new TimeSpan(19, 0, 0)),
        DayOfWeek.Friday    => (new TimeSpan(9, 0, 0), new TimeSpan(19, 0, 0)),
        DayOfWeek.Saturday  => (new TimeSpan(9, 0, 0), new TimeSpan(18, 0, 0)),
        _                   => null // Sunday: closed
    };

    /// <summary>
    /// All possible start times for an appointment of the given duration,
    /// on a 30-minute grid, finishing no later than closing time.
    /// </summary>
    public static List<TimeSpan> SlotsForDate(DateOnly date, int durationMinutes)
    {
        var slots = new List<TimeSpan>();
        var hours = ForDate(date);
        if (hours is null) return slots;

        var duration = TimeSpan.FromMinutes(durationMinutes);
        for (var t = hours.Value.Open; t + duration <= hours.Value.Close; t += SlotStep)
        {
            slots.Add(t);
        }
        return slots;
    }

    /// <summary>Opening hours in a shape the frontend can render directly.</summary>
    public static List<object> WeeklySchedule()
    {
        var days = new[]
        {
            DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday,
            DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday
        };

        return days.Select(d =>
        {
            var sample = DateOnly.FromDateTime(new DateTime(2024, 1, 1))
                .AddDays(((int)d - (int)new DateTime(2024, 1, 1).DayOfWeek + 7) % 7);
            var hours = ForDate(sample);
            return (object)new
            {
                day = d.ToString(),
                open = hours is null ? null : hours.Value.Open.ToString(@"hh\:mm"),
                close = hours is null ? null : hours.Value.Close.ToString(@"hh\:mm"),
                closed = hours is null
            };
        }).ToList();
    }
}
