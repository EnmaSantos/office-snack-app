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

        // This is our helper method for checking admin status from before.
        private async Task<User?> GetAdminFromHeader()
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var userIdValues) || 
                !int.TryParse(userIdValues.FirstOrDefault(), out var userId))
            {
                return null;
            }

            var user = await _context.Users.FindAsync(userId);

            if (user != null && user.IsAdmin)
            {
                return user;
            }

            return null;
        }


        // --- USER MANAGEMENT ---

        // GET: api/admin/users
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<User>>> GetAllUsers()
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            var users = await _context.Users.OrderBy(u => u.DisplayName).ToListAsync();
            return Ok(users);
        }

        // POST: api/admin/adjust-balance
        [HttpPost("adjust-balance")]
        public async Task<IActionResult> AdjustBalance([FromBody] AdjustBalanceRequest request)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            var userToAdjust = await _context.Users.FindAsync(request.UserId);
            if (userToAdjust == null) return NotFound(new { message = "User to adjust not found." });

            userToAdjust.Balance += request.Amount;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Balance updated successfully.", newBalance = userToAdjust.Balance });
        }


        // --- NEW: SNACK MANAGEMENT ---

        // POST: api/admin/snacks
        [HttpPost("snacks")]
        public async Task<ActionResult<Snack>> CreateSnack([FromBody] Snack newSnack)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            _context.Snacks.Add(newSnack);
            await _context.SaveChangesAsync();

            // Return the newly created snack, which now has a SnackId from the database.
            return CreatedAtAction(nameof(GetSnackById), new { id = newSnack.SnackId }, newSnack);
        }

        // PUT: api/admin/snacks/{id}
        [HttpPut("snacks/{id}")]
        public async Task<IActionResult> UpdateSnack(int id, [FromBody] Snack updatedSnack)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            if (id != updatedSnack.SnackId)
            {
                return BadRequest("Snack ID in URL and body do not match.");
            }

            var existingSnack = await _context.Snacks.FindAsync(id);
            if (existingSnack == null)
            {
                return NotFound("Snack not found.");
            }

            // Update the properties of the existing snack.
            existingSnack.Name = updatedSnack.Name;
            existingSnack.Price = updatedSnack.Price;
            existingSnack.Stock = updatedSnack.Stock;
            existingSnack.ImageUrl = updatedSnack.ImageUrl;
            existingSnack.IsAvailable = updatedSnack.IsAvailable;

            await _context.SaveChangesAsync();

            return NoContent(); // A standard successful response for an update.
        }

        // DELETE: api/admin/snacks/{id}
        [HttpDelete("snacks/{id}")]
        public async Task<IActionResult> DeleteSnack(int id)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            var snackToDelete = await _context.Snacks.FindAsync(id);
            if (snackToDelete == null)
            {
                return NotFound("Snack not found.");
            }

            _context.Snacks.Remove(snackToDelete);
            await _context.SaveChangesAsync();

            return NoContent(); // A standard successful response for a delete.
        }

        // This is a helper method used by CreateSnack. It's not a public endpoint.
        [HttpGet("snacks/{id}")]
        [ApiExplorerSettings(IgnoreApi = true)] // This hides it from Swagger
        public async Task<ActionResult<Snack>> GetSnackById(int id)
        {
            var snack = await _context.Snacks.FindAsync(id);
            if (snack == null)
            {
                return NotFound();
            }
            return snack;
        }
    }
}
