# Used by Render (or any Docker host) to run the C# API.
# Build context = repository root.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first (layer caching)
COPY server/CrownAndClipper.Api/CrownAndClipper.Api.csproj server/CrownAndClipper.Api/
RUN dotnet restore server/CrownAndClipper.Api/CrownAndClipper.Api.csproj

# Publish
COPY server/ server/
RUN dotnet publish server/CrownAndClipper.Api/CrownAndClipper.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render injects PORT; Program.cs reads it and binds accordingly.
EXPOSE 8080
ENTRYPOINT ["dotnet", "CrownAndClipper.Api.dll"]
