// File: backend/Controllers/AdminController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;
using Markdown2Pdf;

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

            // Record an adjustment transaction (positive for deposit, negative for deduction)
            var adjustmentTransaction = new Transaction
            {
                UserId = userToAdjust.UserId,
                SnackId = null,
                TransactionAmount = request.Amount,
                Timestamp = DateTime.UtcNow
            };
            _context.Transactions.Add(adjustmentTransaction);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Balance updated successfully.", newBalance = userToAdjust.Balance });
        }

        // POST: api/admin/toggle-admin-status
        [HttpPost("toggle-admin-status")]
        public async Task<IActionResult> ToggleAdminStatus([FromBody] ToggleAdminStatusRequest request)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            var userToToggle = await _context.Users.FindAsync(request.UserId);
            if (userToToggle == null) return NotFound(new { message = "User not found." });

            // Prevent admin from removing their own admin status
            if (userToToggle.UserId == adminUser.UserId)
            {
                return BadRequest(new { message = "You cannot change your own admin status." });
            }

            userToToggle.IsAdmin = !userToToggle.IsAdmin;
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = $"User {userToToggle.DisplayName} is now {(userToToggle.IsAdmin ? "an admin" : "a regular user")}.", 
                isAdmin = userToToggle.IsAdmin 
            });
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

        // --- USER BALANCE AND TRANSACTION MANAGEMENT ---

        // GET: api/admin/user-balances
        [HttpGet("user-balances")]
        public async Task<ActionResult<IEnumerable<object>>> GetUserBalances()
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            var users = await _context.Users
                .OrderBy(u => u.DisplayName)
                .Select(u => new
                {
                    u.UserId,
                    u.Email,
                    u.DisplayName,
                    u.Balance,
                    u.IsAdmin,
                    u.ProfilePictureUrl
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET: api/admin/user-transactions/{userId}
        [HttpGet("user-transactions/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetUserTransactions(int userId)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            // Check if the user exists
            var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
            if (!userExists)
            {
                return NotFound(new { message = "User not found." });
            }

            var transactions = await _context.Transactions
                .Include(t => t.Snack)
                .Include(t => t.User)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Timestamp)
                .Select(t => new
                {
                    t.TransactionId,
                    t.TransactionAmount,
                    t.Timestamp,
                    SnackName = t.Snack != null ? t.Snack.Name : null,
                    SnackPrice = t.Snack != null ? t.Snack.Price : (decimal?)null,
                    SnackImageUrl = t.Snack != null ? t.Snack.ImageUrl : null,
                    UserEmail = t.User.Email,
                    UserDisplayName = t.User.DisplayName
                })
                .ToListAsync();

            return Ok(transactions);
        }

        // GET: api/admin/all-transactions
        [HttpGet("all-transactions")]
        public async Task<ActionResult<IEnumerable<object>>> GetAllTransactions()
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            var transactions = await _context.Transactions
                .Include(t => t.Snack)
                .Include(t => t.User)
                .OrderByDescending(t => t.Timestamp)
                .Select(t => new
                {
                    t.TransactionId,
                    t.UserId,
                    t.TransactionAmount,
                    t.Timestamp,
                    SnackName = t.Snack != null ? t.Snack.Name : null,
                    SnackPrice = t.Snack != null ? t.Snack.Price : (decimal?)null,
                    SnackImageUrl = t.Snack != null ? t.Snack.ImageUrl : null,
                    UserEmail = t.User.Email,
                    UserDisplayName = t.User.DisplayName
                })
                .ToListAsync();

            return Ok(transactions);
        }

        // --- SHOPPING LIST MANAGEMENT ---

        // DEBUG: Simple test endpoint to verify basic functionality
        [HttpGet("test-pdf")]
        public IActionResult TestPdfGeneration()
        {
            try
            {
                var testItems = new List<ShoppingListItem>
                {
                    new ShoppingListItem { Name = "Test Item 1", Quantity = 2, Notes = "Test notes" },
                    new ShoppingListItem { Name = "Test Item 2", Quantity = 1 }
                };

                // First test without PDF generation
                var textContent = GenerateShoppingListText(testItems);
                return Ok(new { message = "Test successful", content = textContent });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Test failed", error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        // Generate Markdown content for the shopping list
        private string GenerateShoppingListMarkdown(List<ShoppingListItem> items)
        {
            var markdown = $@"# Office Snack Shopping List

**Generated on:** {DateTime.Now:MMMM dd, yyyy 'at' hh:mm tt}

---

## Items to Purchase

| Item | Quantity | Notes |
|------|----------|-------|
";

            foreach (var item in items)
            {
                var notes = string.IsNullOrEmpty(item.Notes) ? "-" : item.Notes;
                markdown += $"| {item.Name} | {item.Quantity} | {notes} |\n";
            }

            markdown += $@"

---

## Summary

- **Total Items:** {items.Count}
- **Total Quantity:** {items.Sum(i => i.Quantity)}

---

*This shopping list was automatically generated by the Office Snack Tracker system.*
";

            return markdown;
        }

        // Convert Markdown to PDF using Markdown2Pdf
        private async Task<byte[]> GenerateShoppingListPdfFromMarkdown(string markdownContent)
        {
            try
            {
                Console.WriteLine("Creating PDF from Markdown...");
                
                // Create temporary files for the conversion
                var tempMarkdownFile = Path.GetTempFileName().Replace(".tmp", ".md");
                var tempPdfFile = Path.GetTempFileName().Replace(".tmp", ".pdf");

                try
                {
                    // Write markdown content to temporary file
                    await System.IO.File.WriteAllTextAsync(tempMarkdownFile, markdownContent);
                    
                    // Convert using Markdown2Pdf
                    var converter = new Markdown2PdfConverter();
                    var resultPath = await converter.Convert(tempMarkdownFile);
                    
                    // Read the generated PDF
                    var pdfBytes = await System.IO.File.ReadAllBytesAsync(resultPath);
                    
                    Console.WriteLine($"PDF generated successfully, size: {pdfBytes.Length} bytes");
                    return pdfBytes;
                }
                finally
                {
                    // Clean up temporary files
                    if (System.IO.File.Exists(tempMarkdownFile))
                        System.IO.File.Delete(tempMarkdownFile);
                    if (System.IO.File.Exists(tempPdfFile))
                        System.IO.File.Delete(tempPdfFile);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error converting Markdown to PDF: {ex.Message}");
                throw new Exception($"PDF conversion failed: {ex.Message}", ex);
            }
        }

        // Simple text generation for testing (keeping for fallback)
        private string GenerateShoppingListText(List<ShoppingListItem> items)
        {
            var text = $"Shopping List - Generated: {DateTime.Now:yyyy-MM-dd HH:mm}\n\n";
            text += "Items to Purchase:\n";
            
            foreach (var item in items)
            {
                text += $"• {item.Name} - Quantity: {item.Quantity}";
                if (!string.IsNullOrEmpty(item.Notes))
                {
                    text += $" (Notes: {item.Notes})";
                }
                text += "\n";
            }
            
            text += $"\nTotal Items: {items.Count}\n";
            text += $"Total Quantity: {items.Sum(i => i.Quantity)}";
            
            return text;
        }

        // POST: api/admin/generate-shopping-list
        [HttpPost("generate-shopping-list")]
        public async Task<IActionResult> GenerateShoppingList([FromBody] ShoppingListRequest request)
        {
            try
            {
                var adminUser = await GetAdminFromHeader();
                if (adminUser == null) return Unauthorized();

                if (request?.Items == null || !request.Items.Any())
                {
                    return BadRequest(new { message = "Shopping list cannot be empty." });
                }

                Console.WriteLine($"Generating shopping list with {request.Items.Count} items");
                
                // Generate Markdown content
                var markdownContent = GenerateShoppingListMarkdown(request.Items);
                
                // Convert Markdown to PDF
                var pdfBytes = await GenerateShoppingListPdfFromMarkdown(markdownContent);

                // Return PDF file
                var fileName = $"Shopping_List_{DateTime.Now:yyyy-MM-dd_HH-mm}.pdf";
                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Shopping list generation error: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "Error generating shopping list", error = ex.Message, stackTrace = ex.StackTrace });
            }
        }


    }
}
