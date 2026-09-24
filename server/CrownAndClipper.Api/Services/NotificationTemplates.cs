using CrownAndClipper.Api.Models;
using System.Globalization;

namespace CrownAndClipper.Api.Services;

/// <summary>
/// Plain-text message templates for every notification kind. Bodies include
/// the appointment facts, the shop address and a ready-made Google Calendar
/// link so reminders are actionable from the inbox.
/// </summary>
public static class NotificationTemplates
{
    public static string WhenLine(Booking b) =>
        $"{b.Date.ToString("dddd d MMMM yyyy", CultureInfo.InvariantCulture)} " +
        $"{b.StartTime:hh\\:mm}-{b.EndTime:hh\\:mm}";

    private static string GoogleCalendarLink(Tenant t, Booking b)
    {
        string Compact(TimeSpan ts) => ts.ToString(@"hh\:mm");
        var date = b.Date.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        var text = Uri.EscapeDataString($"{b.Service.Name} at {t.Name} with {b.Barber.Name}");
        var location = Uri.EscapeDataString($"{t.AddressLine}, {t.City} {t.Postcode}");
        var details = Uri.EscapeDataString($"Reference {b.Reference}. Please arrive 5 minutes early.");
        return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
               $"&text={text}&dates={date}T{Compact(b.StartTime).Replace(":", "")}00/{date}T{Compact(b.EndTime).Replace(":", "")}00" +
               $"&ctz={Uri.EscapeDataString(t.Timezone)}&location={location}&details={details}";
    }

    private static string Footer(Tenant t, string siteUrl) =>
        $"\n{t.Name}\n{t.AddressLine}, {t.City} {t.Postcode}\n{t.Phone}\n" +
        $"Need to change or cancel? Call us or manage your booking at {siteUrl}/account\n";

    public static (string Subject, string Body) BookingConfirmed(Tenant t, Booking b, string siteUrl)
    {
        var subject = $"Booking confirmed: {b.Service.Name} on {b.Date:dd MMM} at {b.StartTime:hh\\:mm}";
        var body =
            $"Hi {b.CustomerName},\n\n" +
            $"Your appointment at {t.Name} is confirmed.\n\n" +
            $"Service: {b.Service.Name} ({b.Service.DurationMinutes} minutes)\n" +
            $"With: {b.Barber.Name}\n" +
            $"When: {WhenLine(b)}\n" +
            $"Where: {t.AddressLine}, {t.City} {t.Postcode}\n" +
            $"Reference: {b.Reference}\n\n" +
            $"Add it to your calendar: {GoogleCalendarLink(t, b)}\n" +
            Footer(t, siteUrl);
        return (subject, body);
    }

    public static (string Subject, string Body) BookingCancelled(Tenant t, Booking b, string siteUrl)
    {
        var subject = $"Booking cancelled: {b.Service.Name} on {b.Date:dd MMM} at {b.StartTime:hh\\:mm}";
        var body =
            $"Hi {b.CustomerName},\n\n" +
            $"Your appointment (reference {b.Reference}) at {t.Name} has been cancelled.\n" +
            $"The slot is now free for someone else, and you're welcome to rebook anytime.\n" +
            Footer(t, siteUrl);
        return (subject, body);
    }

    public static (string Subject, string Body) ClientReminder24h(Tenant t, Booking b, string siteUrl)
    {
        var subject = $"Reminder: your {b.Service.Name} at {t.Name} is tomorrow at {b.StartTime:hh\\:mm}";
        var body =
            $"Hi {b.CustomerName},\n\n" +
            $"See you tomorrow! A quick reminder of your appointment:\n\n" +
            $"Service: {b.Service.Name}\n" +
            $"With: {b.Barber.Name}\n" +
            $"When: {WhenLine(b)}\n" +
            $"Where: {t.AddressLine}, {t.City} {t.Postcode}\n" +
            $"Reference: {b.Reference}\n\n" +
            $"Add it to your calendar: {GoogleCalendarLink(t, b)}\n" +
            $"If you need to change it, please call {t.Phone} as soon as you can.\n" +
            Footer(t, siteUrl);
        return (subject, body);
    }

    public static (string Subject, string Body) ClientReminder2h(Tenant t, Booking b, string siteUrl)
    {
        var subject = $"Today at {b.StartTime:hh\\:mm}: your {b.Service.Name} at {t.Name}";
        var body =
            $"Hi {b.CustomerName},\n\n" +
            $"Your {b.Service.Name} with {b.Barber.Name} starts at {b.StartTime:hh\\:mm} today.\n" +
            $"We're at {t.AddressLine}, {t.City} {t.Postcode}. Please arrive 5 minutes early.\n" +
            $"Reference: {b.Reference}\n" +
            Footer(t, siteUrl);
        return (subject, body);
    }

    public static (string Subject, string Body) StaffReminder2h(Tenant t, Booking b, string siteUrl)
    {
        var subject = $"Chair alert: {b.CustomerName} at {b.StartTime:hh\\:mm} ({b.Service.Name})";
        var body =
            $"Hi {b.Barber.Name},\n\n" +
            $"Heads up: in about two hours you have {b.CustomerName} for {b.Service.Name} " +
            $"({b.Service.DurationMinutes} minutes), reference {b.Reference}.\n" +
            $"Notes on the booking: {(string.IsNullOrWhiteSpace(b.Notes) ? "none" : b.Notes)}\n" +
            Footer(t, siteUrl);
        return (subject, body);
    }

    public static (string Subject, string Body) StaffDayAhead(
        Tenant t, Barber barber, IReadOnlyList<Booking> tomorrow, string siteUrl)
    {
        var subject = $"Tomorrow's chair: {tomorrow.Count} appointment{(tomorrow.Count == 1 ? "" : "s")}";
        var lines = string.Join("\n", tomorrow.Select(b =>
            $"  - {b.StartTime:hh\\:mm}-{b.EndTime:hh\\:mm}  {b.CustomerName}  ({b.Service.Name}, ref {b.Reference})"));
        var body =
            $"Hi {barber.Name},\n\n" +
            $"Here's your chair for tomorrow ({tomorrow.First().Date:dddd d MMMM}):\n{lines}\n\n" +
            $"Your full schedule is in the staff dashboard: {siteUrl}/staff\n" +
            Footer(t, siteUrl);
        return (subject, body);
    }
}
