// File: backend/Controllers/AuthController.cs

using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;

namespace SnackTracker.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly SnackTrackerContext _context;

        public AuthController(SnackTrackerContext context)
        {
            _context = context;
        }

        [HttpGet("signin-google")]
        public IActionResult SignInWithGoogle()
        {
            // Build the absolute callback URL with the nginx path prefix
            var configuration = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var apiBaseUrl = configuration["ApiBaseUrl"] ?? "http://localhost:5106";
            var callbackUrl = $"{apiBaseUrl}/api/auth/google-callback";
            
            var properties = new AuthenticationProperties 
            { 
                RedirectUri = callbackUrl,
                Items = { ["redirect_uri"] = callbackUrl }
            };
            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        [HttpGet("google-callback")]
        public async Task<IActionResult> GoogleSignInCallback()
        {
            var result = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);
            if (!result.Succeeded)
            {
                // If auth fails, redirect to frontend with an error
                var frontendUrl = HttpContext.RequestServices
                    .GetRequiredService<IConfiguration>()["FrontendUrl"] ?? "http://localhost:5173";
                return Redirect($"{frontendUrl}?error=auth_failed");
            }

            var claims = result.Principal.Identities.FirstOrDefault()?.Claims;
            var email = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
            var displayName = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
            var profilePictureUrl = claims?.FirstOrDefault(c => c.Type == "picture")?.Value;

            if (string.IsNullOrEmpty(email))
            {
                var frontendUrl = HttpContext.RequestServices
                    .GetRequiredService<IConfiguration>()["FrontendUrl"] ?? "http://localhost:5173";
                return Redirect($"{frontendUrl}?error=email_missing");
            }

            if (!email.EndsWith("@byui.edu", StringComparison.OrdinalIgnoreCase))
            {
                // --- FIX ---
                // If the domain is wrong, redirect to the frontend with a specific error message.
                // This provides a much better user experience than a JSON error page.
                var frontendUrl = HttpContext.RequestServices
                    .GetRequiredService<IConfiguration>()["FrontendUrl"] ?? "http://localhost:5173";
                return Redirect($"{frontendUrl}?error=invalid_domain");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                user = new User { Email = email, DisplayName = displayName, ProfilePictureUrl = profilePictureUrl };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }
            else
            {
                // Update existing user's profile picture URL if it has changed
                if (user.ProfilePictureUrl != profilePictureUrl)
                {
                    user.ProfilePictureUrl = profilePictureUrl;
                    await _context.SaveChangesAsync();
                }
            }

            // Sign into our cookie scheme so subsequent API calls carry an auth cookie
            var identity = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.DisplayName ?? user.Email),
                new Claim(ClaimTypes.Email, user.Email)
            }, CookieAuthenticationDefaults.AuthenticationScheme);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(identity));

            var userJson = JsonSerializer.Serialize(user);
            var encodedUser = System.Web.HttpUtility.UrlEncode(userJson);
            var frontendUrlSuccess = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["FrontendUrl"] ?? "http://localhost:5173";
            return Redirect($"{frontendUrlSuccess}?user={encodedUser}");
        }

        [HttpGet("signout")]
        public async Task<IActionResult> SignOut()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            var frontendUrl = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["FrontendUrl"] ?? "http://localhost:5173";
            return Redirect(frontendUrl);
        }

        // DEVELOPMENT ONLY: Toggle admin status for testing
        [HttpPost("toggle-admin/{userId}")]
        public async Task<IActionResult> ToggleAdminForTesting(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            user.IsAdmin = !user.IsAdmin;
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = $"User {user.DisplayName} is now {(user.IsAdmin ? "an admin" : "a regular user")}",
                user = user
            });
        }
    }
}
