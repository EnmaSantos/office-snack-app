// File: backend/Controllers/AuthController.cs

using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
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
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public AuthController(SnackTrackerContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        // Sync authentication with main site
        [HttpPost("sync-main-site")]
        public async Task<IActionResult> SyncWithMainSite()
        {
            try
            {
                // Call main site's auth status endpoint
                var mainSiteUrl = _configuration["MainSiteUrl"] ?? "https://ftcemp.byui.edu";
                var httpClient = _httpClientFactory.CreateClient();
                
                // Forward the cookies from the request
                var cookieHeader = Request.Headers["Cookie"].ToString();
                if (!string.IsNullOrEmpty(cookieHeader))
                {
                    httpClient.DefaultRequestHeaders.Add("Cookie", cookieHeader);
                }

                var response = await httpClient.GetAsync($"{mainSiteUrl}/auth/status");
                
                if (!response.IsSuccessStatusCode)
                {
                    return Unauthorized(new { message = "Not authenticated on main site" });
                }

                var content = await response.Content.ReadAsStringAsync();
                var authStatus = JsonSerializer.Deserialize<MainSiteAuthStatus>(content, new JsonSerializerOptions 
                { 
                    PropertyNameCaseInsensitive = true 
                });

                if (authStatus == null || !authStatus.IsAuthenticated || authStatus.User == null)
                {
                    return Unauthorized(new { message = "Not authenticated on main site" });
                }

                var email = authStatus.User.Email;
                var displayName = authStatus.User.DisplayName;
                var profilePictureUrl = authStatus.User.ProfilePhoto;

                if (string.IsNullOrEmpty(email))
                {
                    return BadRequest(new { message = "Email not found in main site auth" });
                }

                // Find or create user in our database
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (user == null)
                {
                    user = new User 
                    { 
                        Email = email, 
                        DisplayName = displayName,
                        ProfilePictureUrl = profilePictureUrl 
                    };
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    // Update user info if it changed
                    var updated = false;
                    if (user.DisplayName != displayName)
                    {
                        user.DisplayName = displayName;
                        updated = true;
                    }
                    if (user.ProfilePictureUrl != profilePictureUrl)
                    {
                        user.ProfilePictureUrl = profilePictureUrl;
                        updated = true;
                    }
                    if (updated)
                    {
                        await _context.SaveChangesAsync();
                    }
                }

                // Sign into our cookie scheme
                var identity = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Name, user.DisplayName ?? user.Email),
                    new Claim(ClaimTypes.Email, user.Email)
                }, CookieAuthenticationDefaults.AuthenticationScheme);

                await HttpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(identity));

                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error syncing with main site", error = ex.Message });
            }
        }

        // Check current authentication status
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            if (!User.Identity?.IsAuthenticated ?? true)
            {
                return Unauthorized();
            }

            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(email))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                return Unauthorized();
            }

            return Ok(user);
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
