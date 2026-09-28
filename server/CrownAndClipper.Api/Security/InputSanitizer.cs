using System.Text;
using System.Text.RegularExpressions;

namespace CrownAndClipper.Api.Security;

/// <summary>
/// Input hygiene and validation for every customer-supplied string.
/// This is defense-in-depth, not the injection boundary: EF Core
/// parameterises all queries (no raw SQL) and React escapes rendered values
/// by default. This layer strips control/zero-width/bidi-override characters
/// that survive those layers into stored text, collapses whitespace, and
/// validates shape + length before anything reaches the database or a
/// response (lengths are additionally enforced by EF HasMaxLength columns).
/// </summary>
public static class InputSanitizer
{
    private static readonly Regex WhitespaceRun = new(@"\s+", RegexOptions.Compiled);
    private static readonly Regex BlankLineRun = new(@"\n{3,}", RegexOptions.Compiled);
    private static readonly Regex NameShape = new(@"^[\p{L}\p{M}'’.\- ]{2,80}$", RegexOptions.Compiled);
    private static readonly Regex EmailShape =
        new(@"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$", RegexOptions.Compiled);
    private static readonly Regex PhoneShape = new(@"^\+?[0-9 ()-]{7,20}$", RegexOptions.Compiled);

    /// <summary>
    /// Single-line field: control chars removed, whitespace collapsed.
    /// Never truncates: callers validate length so over-long input is
    /// rejected with a validation error instead of silently shortened.
    /// </summary>
    public static string SingleLine(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "";
        var stripped = StripControl(input, allowNewline: false);
        return WhitespaceRun.Replace(stripped, " ").Trim();
    }

    /// <summary>Multi-line field (notes, messages): keeps single newlines.</summary>
    public static string MultiLine(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "";
        var stripped = StripControl(input, allowNewline: true);
        var normalized = stripped.Replace("\r\n", "\n").Replace('\r', '\n');
        normalized = Regex.Replace(normalized, "[ \t]+\n", "\n");
        normalized = BlankLineRun.Replace(normalized, "\n\n").Trim();
        return normalized;
    }

    public static bool IsValidName(string name) =>
        name.Length >= 2 && name.Length <= 80 && NameShape.IsMatch(name);

    public static bool IsValidEmail(string email) =>
        email.Length >= 5 && email.Length <= 254 && !email.Contains("..") && EmailShape.IsMatch(email);

    public static bool IsValidPhone(string phone)
    {
        var digits = phone.Count(char.IsDigit);
        return digits >= 7 && digits <= 15 && PhoneShape.IsMatch(phone);
    }

    private static string StripControl(string input, bool allowNewline)
    {
        var sb = new StringBuilder(input.Length);
        foreach (var ch in input)
        {
            if (allowNewline && ch == '\n')
            {
                sb.Append(ch);
                continue;
            }
            if (char.IsControl(ch)) continue;          // NUL, BEL, escapes, …
            if (ch == '​' || ch == '﻿') continue; // zero-width / BOM
            if (ch == '‮' || ch == '‭') continue; // bidi overrides (spoofing)
            sb.Append(ch);
        }
        return sb.ToString();
    }
}
