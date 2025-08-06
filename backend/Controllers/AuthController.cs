// File: backend/Controllers/AuthController.cs

using System.Security.Claims;
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

        public AuthController(SnackTrackerContext context)
        {
            _context = context;
        }

        // This endpoint will be called by our frontend after the user signs in with Google.
        [HttpGet("signin-google")]
        public IActionResult SignInWithGoogle()
        {
            // This initiates the redirect to Google's login page.
            // The "redirectUri" is where Google will send the user back to after they sign in.
            var properties = new AuthenticationProperties { RedirectUri = Url.Action(nameof(GoogleSignInCallback)) };
            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        // This is the callback endpoint that Google will redirect to.
        [HttpGet("google-callback")]
        public async Task<IActionResult> GoogleSignInCallback()
        {
            // 1. Get the authentication result from the cookie.
            var result = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);
            if (!result.Succeeded)
            {
                return BadRequest("Failed to authenticate with Google.");
            }

            // 2. Extract user information (claims) from the result.
            var claims = result.Principal.Identities.FirstOrDefault()?.Claims;
            var email = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
            var displayName = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(email))
            {
                return BadRequest("Could not retrieve email from Google.");
            }

            // 3. IMPORTANT: Check if the email domain is byui.edu
            if (!email.EndsWith("@byui.edu", StringComparison.OrdinalIgnoreCase))
            {
                // If not, forbid access.
                return Forbid("Access denied. Only byui.edu accounts are allowed.");
            }

            // 4. Find or create the user in our database.
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                // If the user doesn't exist, create a new one.
                user = new User
                {
                    Email = email,
                    DisplayName = displayName,
                    Balance = 0, // New users start with a zero balance
                    IsAdmin = false // Default to not being an admin
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            // 5. For now, just return the user's details.
            // In a later step, we would create a session token (JWT) here.
            return Ok(new { message = "Login successful!", user });
        }
    }
}
