// File: backend/Program.cs

using Microsoft.AspNetCore.Authentication.Google; // Add this
using Microsoft.AspNetCore.Authentication.Cookies; // Add this
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using SnackTracker.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// --- Database Configuration ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=SnackTracker.db";
builder.Services.AddDbContext<SnackTrackerContext>(options =>
    options.UseSqlite(connectionString));

// --- Add services to the container. ---

// --- UPDATED AUTHENTICATION CONFIGURATION ---
builder.Services.AddAuthentication(options =>
    {
        // We use cookies to temporarily store the user's session after they sign in.
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
    })
    .AddCookie() // Add cookie handling
    .AddGoogle(options => // Add Google authentication
    {
        // These lines read the Client ID and Secret from the Secret Manager.
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"];
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
