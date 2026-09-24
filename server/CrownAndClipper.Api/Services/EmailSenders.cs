using MimeKit;

namespace CrownAndClipper.Api.Services;

public record EmailMessage(
    string From,
    string To,
    string Subject,
    string Body);

/// <summary>
/// Email transport abstraction. The SMTP implementation is used whenever
/// SMTP settings exist; otherwise the log/outbox implementation keeps the
/// whole reminder pipeline fully functional and inspectable in the admin
/// dashboard (and in server logs) without any external dependency.
/// </summary>
public interface IEmailSender
{
    string ProviderName { get; }
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

/// <summary>
/// Default transport: records the message in the application log. Combined
/// with the notifications outbox table, every reminder is visible and
/// testable even before real SMTP credentials are configured.
/// </summary>
public sealed class LogEmailSender : IEmailSender
{
    private readonly ILogger<LogEmailSender> _logger;

    public LogEmailSender(ILogger<LogEmailSender> logger) => _logger = logger;

    public string ProviderName => "log";

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "EMAIL (log transport) from {From} to {To}: {Subject}\n{Body}",
            message.From, message.To, message.Subject, message.Body);
        return Task.CompletedTask;
    }
}

/// <summary>
/// Real transport via SMTP (works with SendGrid, Mailgun, Fastmail, Gmail app
/// passwords, self-hosted servers...). Enabled by setting SMTP__HOST etc.
/// </summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    public string ProviderName => "smtp";

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var host = _config["SMTP:Host"] ?? throw new InvalidOperationException("SMTP:Host is not configured.");
        var port = int.TryParse(_config["SMTP:Port"], out var p) ? p : 587;
        var username = _config["SMTP:Username"];
        var password = _config["SMTP:Password"];

        var mime = new MimeKit.MimeMessage();
        mime.From.Add(MailboxAddress.Parse(message.From));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;
        mime.Body = new MimeKit.TextPart("plain") { Text = message.Body };

        using var client = new MailKit.Net.Smtp.SmtpClient();
        await client.ConnectAsync(host, port, MailKit.Security.SecureSocketOptions.Auto, cancellationToken);
        try
        {
            if (!string.IsNullOrWhiteSpace(username))
            {
                await client.AuthenticateAsync(username, password ?? string.Empty, cancellationToken);
            }

            await client.SendAsync(mime, cancellationToken);
        }
        finally
        {
            await client.DisconnectAsync(true, cancellationToken);
        }

        _logger.LogInformation("EMAIL (smtp) sent to {To}: {Subject}", message.To, message.Subject);
    }
}
