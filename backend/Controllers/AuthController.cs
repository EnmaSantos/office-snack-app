// File: backend/Controllers/AuthController.cs

using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
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
        private readonly IConfiguration _configuration;

        public AuthController(SnackTrackerContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpGet("signin-google")]
        public IActionResult SignInWithGoogle()
        {
            var properties = new AuthenticationProperties { RedirectUri = Url.Action(nameof(GoogleSignInCallback)) };
            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        [HttpGet("google-callback")]
        public async Task<IActionResult> GoogleSignInCallback()
        {
            var result = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);
            if (!result.Succeeded)
            {
                return BadRequest("Failed to authenticate with Google.");
            }

            var claims = result.Principal.Identities.FirstOrDefault()?.Claims;
            var email = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
            var displayName = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(email))
            {
                return BadRequest("Could not retrieve email from Google.");
            }

            if (!email.EndsWith("@byui.edu", StringComparison.OrdinalIgnoreCase))
            {
                // --- FIX ---
                // Instead of Forbid(), we return a StatusCode result.
                // This sends the correct 403 Forbidden status along with our custom message in a JSON object.
                return StatusCode(403, new { message = "Access denied. Only byui.edu accounts are allowed." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                user = new User
                {
                    Email = email,
                    DisplayName = displayName,
                    Balance = 0,
                    IsAdmin = false
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            // Serialize the user object to a JSON string.
            var userJson = JsonSerializer.Serialize(user);
            // URL-encode the JSON string so it can be safely passed in a URL.
            var encodedUser = System.Web.HttpUtility.UrlEncode(userJson);
            
            // Redirect back to the frontend, passing the user data as a query parameter.
            return Redirect($"http://localhost:5173?user={encodedUser}");
        }
    }
}
