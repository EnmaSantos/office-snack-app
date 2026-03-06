// File: backend/Program.cs

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using SnackTracker.Api.Data;
using SnackTracker.Api.Services;
using System.Text.Json.Serialization;

// Load environment variables from .env if present (for local/dev)
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Configure forwarded headers for proxy support
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedPrefix;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// --- Database Configuration ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? 
    $"Data Source={Path.Combine(builder.Environment.ContentRootPath, "SnackTracker.db")}";
builder.Services.AddDbContext<SnackTrackerContext>(options =>
    options.UseSqlite(connectionString));

// Register Inventory Service
builder.Services.AddScoped<InventoryService>();

// Register Google Sheets Service with HttpClient
builder.Services.AddHttpClient<GoogleSheetsService>();

// --- Add services to the container. ---

// --- SIMPLE COOKIE AUTHENTICATION (uses main site's auth) ---
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "SnackTracker.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.Path = "/";
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() 
            ? CookieSecurePolicy.SameAsRequest 
            : CookieSecurePolicy.Always;

        // Return 401 for API endpoints instead of redirecting
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            },
            OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
        };
    });

// Add HttpClient for calling main site auth API
builder.Services.AddHttpClient();


builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    // Use PascalCase for JSON to match frontend expectations
    options.JsonSerializerOptions.PropertyNamingPolicy = null;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("UserIdHeader", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Name = "X-User-Id",
        Type = SecuritySchemeType.ApiKey,
        Description = "User ID for temporary admin authentication."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "UserIdHeader"
                }
            },
            new string[] {}
        }
    });
});

// --- CORS: Allow frontend origin from configuration ---
const string FrontendCorsPolicy = "Frontend";
var frontendUrlSetting = builder.Configuration["FrontendUrl"] ?? "http://localhost:5173";
var frontendOrigins = frontendUrlSetting
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (frontendOrigins.Length == 0)
{
    frontendOrigins = new[] { "http://localhost:5173" };
}
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins(frontendOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// Use forwarded headers from proxy (Nginx)
// This processes X-Forwarded-Prefix header set by nginx
app.UseForwardedHeaders();

app.SeedDatabase();

// --- Configure the HTTP request pipeline. ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
