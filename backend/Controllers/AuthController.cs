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
            var properties = new AuthenticationProperties { RedirectUri = Url.Action(nameof(GoogleSignInCallback)) };
            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        [HttpGet("google-callback")]
        public async Task<IActionResult> GoogleSignInCallback()
        {
            var result = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);
            if (!result.Succeeded)
            {
                // If auth fails, redirect to frontend with an error
                return Redirect("http://localhost:5173?error=auth_failed");
            }

            var claims = result.Principal.Identities.FirstOrDefault()?.Claims;
            var email = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
            var displayName = claims?.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(email))
            {
                return Redirect("http://localhost:5173?error=email_missing");
            }

            if (!email.EndsWith("@byui.edu", StringComparison.OrdinalIgnoreCase))
            {
                // --- FIX ---
                // If the domain is wrong, redirect to the frontend with a specific error message.
                // This provides a much better user experience than a JSON error page.
                return Redirect("http://localhost:5173?error=invalid_domain");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                user = new User { Email = email, DisplayName = displayName };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            var userJson = JsonSerializer.Serialize(user);
            var encodedUser = System.Web.HttpUtility.UrlEncode(userJson);
            
            return Redirect($"http://localhost:5173?user={encodedUser}");
        }

        [HttpGet("signout")]
        public async Task<IActionResult> SignOut()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Redirect("http://localhost:5173");
        }
    }
}
