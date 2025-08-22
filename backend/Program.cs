// File: backend/Program.cs

using Microsoft.AspNetCore.Authentication.Google; // Add this
using Microsoft.AspNetCore.Authentication.Cookies; // Add this
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using SnackTracker.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// --- Database Configuration ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? 
    $"Data Source={Path.Combine(builder.Environment.ContentRootPath, "SnackTracker.db")}";
builder.Services.AddDbContext<SnackTrackerContext>(options =>
    options.UseSqlite(connectionString));

// --- Add services to the container. ---

// --- UPDATED AUTHENTICATION CONFIGURATION ---
builder.Services.AddAuthentication(options =>
    {
        // Use cookies for auth; do not auto-redirect to Google on API challenges
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    })
    .AddCookie(options =>
    {
        options.Cookie.Name = "SnackTracker.Auth";
        options.Cookie.HttpOnly = true;

        if (builder.Environment.IsDevelopment())
        {
            // For localhost over HTTP, allow cookie without Secure and with Lax SameSite
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        }
        else
        {
            // In production, use cross-site cookie only over HTTPS
            options.Cookie.SameSite = SameSiteMode.None;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        }

        // Avoid 302 redirects for APIs; return proper status codes
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                }
                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            },
            OnRedirectToAccessDenied = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                }
                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            }
        };
    }) // Add cookie handling
    .AddGoogle(options => // Add Google authentication
    {
        // These lines read the Client ID and Secret from the Secret Manager.
        var clientId = builder.Configuration["Authentication:Google:ClientId"];
        var clientSecret = builder.Configuration["Authentication:Google:ClientSecret"];

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        {
            throw new InvalidOperationException("Google authentication credentials are not configured.");
        }

        options.ClientId = clientId;
        options.ClientSecret = clientSecret;
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.ClaimActions.MapJsonKey("picture", "picture", "url");
    });


builder.Services.AddControllers();
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

// --- CORS: Allow frontend (Vite) origin ---
const string FrontendCorsPolicy = "Frontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

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
