// File: backend/Controllers/AdminController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;

namespace SnackTracker.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly SnackTrackerContext _context;

        public AdminController(SnackTrackerContext context)
        {
            _context = context;
        }

        // --- PRIVATE HELPER METHOD for checking admin status ---
        private async Task<User?> GetAdminFromHeader()
        {
            // Try to get the user ID from the "X-User-Id" header.
            if (!Request.Headers.TryGetValue("X-User-Id", out var userIdValues) || 
                !int.TryParse(userIdValues.FirstOrDefault(), out var userId))
            {
                // If the header is missing or not a valid number, fail.
                return null;
            }

            var user = await _context.Users.FindAsync(userId);

            // Return the user only if they exist AND are an admin.
            if (user != null && user.IsAdmin)
            {
                return user;
            }

            // Otherwise, return null to indicate failure.
            return null;
        }


        // GET: api/admin/users
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<User>>> GetAllUsers()
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null)
            {
                // If the user isn't a valid admin, return a 401 Unauthorized status.
                // Since we're not using proper authentication schemes yet, use Unauthorized instead of Forbid.
                return Unauthorized();
            }

            var users = await _context.Users
                .OrderBy(u => u.DisplayName)
                .ToListAsync();

            return Ok(users);
        }

        // POST: api/admin/adjust-balance
        [HttpPost("adjust-balance")]
        public async Task<IActionResult> AdjustBalance([FromBody] AdjustBalanceRequest request)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null)
            {
                return Unauthorized(); // Returns a 401 Unauthorized status
            }

            // Find the user to adjust by their ID from the request body.
            var userToAdjust = await _context.Users.FindAsync(request.UserId);

            // If the user doesn't exist, return a "Not Found" error.
            if (userToAdjust == null)
            {
                return NotFound(new { message = "User to adjust not found." });
            }

            // Add the requested amount to the user's current balance.
            userToAdjust.Balance += request.Amount;

            // Save the changes to the database.
            await _context.SaveChangesAsync();

            // Return a success message with the user's new balance.
            return Ok(new { message = "Balance updated successfully.", newBalance = userToAdjust.Balance });
        }
    }
}
