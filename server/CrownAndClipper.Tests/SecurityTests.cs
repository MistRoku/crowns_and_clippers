using CrownAndClipper.Api.Security;

namespace CrownAndClipper.Tests;

/// <summary>
/// Unit coverage for password hashing and input validation — the pure,
/// deterministic halves of the auth/input pipeline. Token issuance and the
/// double-booking race are covered end-to-end by tenant-test.mjs and
/// smoke-test.mjs against a live API.
/// </summary>
public class SecurityTests
{
    [Fact]
    public void PasswordHasher_RoundTrip()
    {
        var stored = PasswordHasher.Hash("Correct Horse 2024!");

        Assert.StartsWith("v1$", stored);
        Assert.True(PasswordHasher.Verify("Correct Horse 2024!", stored));
    }

    [Fact]
    public void PasswordHasher_WrongPasswordFails()
    {
        var stored = PasswordHasher.Hash("Correct Horse 2024!");

        Assert.False(PasswordHasher.Verify("correct horse 2024!", stored));
        Assert.False(PasswordHasher.Verify("", stored));
        Assert.False(PasswordHasher.Verify("x", "not-a-hash"));
    }

    [Fact]
    public void PasswordHasher_SaltsDiffer()
    {
        // Same password must never produce the same stored value.
        Assert.NotEqual(PasswordHasher.Hash("same-password"), PasswordHasher.Hash("same-password"));
    }

    [Theory]
    [InlineData("Thabo Mokoena", true)]
    [InlineData("Amara Mensah", true)]
    [InlineData("X", false)] // too short
    [InlineData("Name <script>alert(1)</script>", false)] // markup rejected
    public void InputSanitizer_Names(string name, bool valid)
    {
        Assert.Equal(valid, InputSanitizer.IsValidName(name));
    }

    [Theory]
    [InlineData("you@example.co.za", true)]
    [InlineData("a.b@mail.com", true)]
    [InlineData("not-an-email", false)]
    [InlineData("x@y..com", false)]
    public void InputSanitizer_Emails(string email, bool valid)
    {
        Assert.Equal(valid, InputSanitizer.IsValidEmail(email));
    }

    [Theory]
    [InlineData("+27 11 482 1234", true)]
    [InlineData("082 123 4567", true)]
    [InlineData("1", false)]
    public void InputSanitizer_Phones(string phone, bool valid)
    {
        Assert.Equal(valid, InputSanitizer.IsValidPhone(phone));
    }

    [Fact]
    public void InputSanitizer_StripsControlCharsAndCollapsesWhitespace()
    {
        // BEL (control) and zero-width space are stripped; runs collapse.
        Assert.Equal("Test Customer", InputSanitizer.SingleLine("Test\u0007 Customer\u200B"));
        Assert.Equal("a b", InputSanitizer.SingleLine("a   b"));
    }

    [Fact]
    public void InputSanitizer_MultiLineKeepsSingleNewlines()
    {
        Assert.Equal("line one\nline two", InputSanitizer.MultiLine("line one\nline two"));
        Assert.Equal("a\n\nb", InputSanitizer.MultiLine("a\n\n\n\nb"));
    }
}
