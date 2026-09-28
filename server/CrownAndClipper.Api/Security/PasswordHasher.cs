using System.Security.Cryptography;

namespace CrownAndClipper.Api.Security;

/// <summary>
/// PBKDF2 (SHA-256, 100k iterations, 16-byte salt, 32-byte subkey) password
/// hashing with constant-time verification — the same construction as
/// ASP.NET Core Identity's default hasher (PBKDF2-HMACSHA256, versioned
/// salt$subkey format), implemented directly to avoid pulling the full
/// Identity + EF store stack for a JWT-only API. Stored format:
/// v1$base64(salt)$base64(subkey)
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);
        return $"v1${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
    }

    public static bool Verify(string password, string stored)
    {
        try
        {
            var parts = stored.Split('$');
            if (parts.Length != 3 || parts[0] != "v1") return false;

            var salt = Convert.FromBase64String(parts[1]);
            var expected = Convert.FromBase64String(parts[2]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
