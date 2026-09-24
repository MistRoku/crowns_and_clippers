namespace CrownAndClipper.Api.Data;

/// <summary>
/// The tenant resolved for the current request. Registered as scoped; the
/// tenant resolver middleware populates it before any DbContext is used, and
/// the DbContext's global query filters read from it so every query is
/// tenant-scoped by construction.
/// </summary>
public interface ITenantContext
{
    int Id { get; }
    string Slug { get; }
    bool IsResolved { get; }
    void Set(int id, string slug);
}

public sealed class TenantContext : ITenantContext
{
    public int Id { get; private set; }
    public string Slug { get; private set; } = "";
    public bool IsResolved { get; private set; }

    public void Set(int id, string slug)
    {
        Id = id;
        Slug = slug;
        IsResolved = true;
    }
}
