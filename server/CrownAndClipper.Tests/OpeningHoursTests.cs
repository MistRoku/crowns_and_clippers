using CrownAndClipper.Api.Data;
using Xunit;

namespace CrownAndClipper.Tests;

/// <summary>
/// Unit coverage for the availability engine's slot grid
/// (<see cref="OpeningHours"/>). The concurrent double-booking path
/// (SemaphoreSlim gate + unique index + 409) is exercised end-to-end by
/// smoke-test.mjs — which CI also runs — because it needs a live database;
/// these tests pin the pure grid math that feed it.
/// </summary>
public class OpeningHoursTests
{
    // 2024-01-01 was a Monday; 2024-01-06 a Saturday; 2024-01-07 a Sunday.
    private static readonly DateOnly Monday = new(2024, 1, 1);
    private static readonly DateOnly Saturday = new(2024, 1, 6);
    private static readonly DateOnly Sunday = new(2024, 1, 7);

    [Fact]
    public void ForDate_WeekdayHoursAre9To19()
    {
        var hours = OpeningHours.ForDate(Monday);

        Assert.NotNull(hours);
        Assert.Equal(new TimeSpan(9, 0, 0), hours.Value.Open);
        Assert.Equal(new TimeSpan(19, 0, 0), hours.Value.Close);
    }

    [Fact]
    public void ForDate_SaturdayClosesAt18()
    {
        var hours = OpeningHours.ForDate(Saturday);

        Assert.NotNull(hours);
        Assert.Equal(new TimeSpan(9, 0, 0), hours.Value.Open);
        Assert.Equal(new TimeSpan(18, 0, 0), hours.Value.Close);
    }

    [Fact]
    public void ForDate_SundayIsClosed()
    {
        Assert.Null(OpeningHours.ForDate(Sunday));
    }

    [Fact]
    public void SlotsForDate_SundayIsEmpty()
    {
        Assert.Empty(OpeningHours.SlotsForDate(Sunday, 30));
    }

    [Fact]
    public void SlotsForDate_30MinService_Runs9To1830On30MinGrid()
    {
        var slots = OpeningHours.SlotsForDate(Monday, 30);

        Assert.Equal(20, slots.Count);
        Assert.Equal(new TimeSpan(9, 0, 0), slots.First());
        Assert.Equal(new TimeSpan(18, 30, 0), slots.Last());
        Assert.All(slots, s => Assert.Equal(0, s.Minutes % 30));
    }

    [Fact]
    public void SlotsForDate_90MinService_LastStartLeavesRoomToClose()
    {
        // 17:30 + 90 min = 19:00 close; 18:00 would overrun.
        var slots = OpeningHours.SlotsForDate(Monday, 90);

        Assert.Equal(18, slots.Count);
        Assert.Equal(new TimeSpan(9, 0, 0), slots.First());
        Assert.Equal(new TimeSpan(17, 30, 0), slots.Last());
    }

    [Fact]
    public void SlotsForDate_45MinService_LastStartIs1800()
    {
        // 18:00 + 45 min = 18:45 <= 19:00; 18:30 would overrun.
        var slots = OpeningHours.SlotsForDate(Monday, 45);

        Assert.Equal(19, slots.Count);
        Assert.Equal(new TimeSpan(18, 0, 0), slots.Last());
    }

    [Fact]
    public void SlotsForDate_SaturdayHasFewerSlotsThanWeekday()
    {
        var weekday = OpeningHours.SlotsForDate(Monday, 30);
        var saturday = OpeningHours.SlotsForDate(Saturday, 30);

        Assert.Equal(20, weekday.Count);
        Assert.Equal(18, saturday.Count);
        Assert.Equal(new TimeSpan(17, 30, 0), saturday.Last());
    }
}
