// File: backend/Controllers/AdminController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;
using Markdown2Pdf;

using SnackTracker.Api.Services;

namespace SnackTracker.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly SnackTrackerContext _context;
        private readonly InventoryService _inventoryService;
        private readonly GoogleSheetsService _googleSheetsService;

        public AdminController(SnackTrackerContext context, InventoryService inventoryService, GoogleSheetsService googleSheetsService)
        {
            _context = context;
            _inventoryService = inventoryService;
            _googleSheetsService = googleSheetsService;
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

        public class DistributeCreditsRequest
        {
            public string WeekSheetName { get; set; } = string.Empty;
        }

        // GET: api/admin/sheet-names
        [HttpGet("sheet-names")]
        public async Task<IActionResult> GetGoogleSheetNames()
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            try 
            {
                var names = await _googleSheetsService.GetSheetNamesAsync();
                return Ok(names);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching Google Sheets tabs: " + ex.Message });
            }
        }

        // POST: api/admin/distribute-weekly-credits
        [HttpPost("distribute-weekly-credits")]
        public async Task<IActionResult> DistributeWeeklyCredits([FromBody] DistributeCreditsRequest request)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            if (string.IsNullOrEmpty(request.WeekSheetName))
            {
                return BadRequest(new { message = "Sheet name is required." });
            }

            try
            {
                // 1. Fetch data from Google Sheets
                var weeklyHours = await _googleSheetsService.GetWeeklyHoursAsync(request.WeekSheetName);
                
                if (weeklyHours.Count == 0)
                {
                    return BadRequest(new { message = $"No hours found in sheet '{request.WeekSheetName}'." });
                }

                int usersUpdated = 0;
                decimal totalCreditsDistributed = 0;

                // 2. Wrap in a database transaction
                using var dbTransaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    var allUsers = await _context.Users.ToListAsync();

                    foreach (var kvp in weeklyHours)
                    {
                        var sheetName = kvp.Key;
                        var hours = kvp.Value;

                        // Calculate credits: $1 per 4 hours (rounded down to nearest multiple of 4)
                        var creditsToAward = Math.Floor(hours / 4.0m) * 1.00m;

                        if (creditsToAward <= 0) continue; // Skip if no credits earned

                        // Attempt to match the user. We match by DisplayName. 
                        // Note: Depending on data cleanliness, this might need fuzzy matching later
                        var user = allUsers.FirstOrDefault(u => 
                            !string.IsNullOrEmpty(u.DisplayName) && 
                            u.DisplayName.Equals(sheetName, StringComparison.OrdinalIgnoreCase));

                        if (user != null)
                        {
                            user.Balance += creditsToAward;
                            
                            var depositTransaction = new Transaction
                            {
                                UserId = user.UserId,
                                SnackId = null,
                                TransactionAmount = creditsToAward,
                                Timestamp = DateTime.UtcNow
                            };
                            _context.Transactions.Add(depositTransaction);
                            
                            usersUpdated++;
                            totalCreditsDistributed += creditsToAward;
                        }
                    }

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    return Ok(new { 
                        message = "Credits distributed successfully.", 
                        usersUpdated = usersUpdated, 
                        totalDistributed = totalCreditsDistributed 
                    });
                }
                catch (Exception dbEx)
                {
                    await dbTransaction.RollbackAsync();
                    throw new Exception("Database update failed.", dbEx);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error distributing credits: " + ex.Message });
            }
        }

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
        // POST: api/admin/snacks
        [HttpPost("snacks")]
        public async Task<ActionResult<Snack>> CreateSnack([FromBody] CreateSnackRequest request)
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            if (request.InitialStock <= 0) return BadRequest("Initial stock must be greater than 0.");
            if (request.TotalCost < 0) return BadRequest("Total cost cannot be negative.");

            using var transaction = await _context.Database.BeginTransactionAsync();

            try 
            {
                // Create the basic snack entity (initially with 0 stock/price, will be updated by service)
                var newSnack = new Snack
                {
                    Name = request.Name,
                    ImageUrl = request.ImageUrl,
                    IsAvailable = request.IsAvailable,
                    Stock = 0,
                    Price = 0
                };

                _context.Snacks.Add(newSnack);
                await _context.SaveChangesAsync(); // Save to get the ID

                // Add the initial batch using the service
                // This will automatically calculate the unit cost and set the Price/Stock on the Snack entity
                await _inventoryService.AddBatchAsync(newSnack.SnackId, request.InitialStock, request.TotalCost);
                
                await transaction.CommitAsync();

                // Refresh the snack entity to get updated values
                // Use AsNoTracking() to bypass the cache and get the fresh data from DB
                var updatedSnack = await _context.Snacks
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SnackId == newSnack.SnackId);

                // Return the newly created snack
                return CreatedAtAction(nameof(GetSnackById), new { id = updatedSnack.SnackId }, updatedSnack);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Failed to create snack: " + ex.Message });
            }
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

        // GET: api/admin/store-trends
        [HttpGet("store-trends")]
        public async Task<IActionResult> GetStoreTrends()
        {
            var adminUser = await GetAdminFromHeader();
            if (adminUser == null) return Unauthorized();

            try
            {
                // 1. Total Store Revenue (sum of all negative transactions, math.abs them)
                // Filter out positive transactions (which are balance additions/credits)
                var amountSpent = await _context.Transactions
                    .Where(t => t.TransactionAmount < 0)
                    .SumAsync(t => Math.Abs(t.TransactionAmount));

                // Total Credits Distributed (sum of positive transactions not linked to a specific external payment system)
                // For simplicity here relative to our requirements, we sum all positive amounts.
                var creditsAdded = await _context.Transactions
                    .Where(t => t.TransactionAmount > 0)
                    .SumAsync(t => t.TransactionAmount);


                // 2. Best Sellers
                // Group purchases by SnackId
                var bestSellers = await _context.Transactions
                    .Where(t => t.SnackId != null && t.TransactionAmount <= 0) // Only count actual purchases
                    .GroupBy(t => t.SnackId)
                    .Select(g => new
                    {
                        SnackId = g.Key,
                        UnitsSold = g.Count(),
                        Revenue = g.Sum(t => Math.Abs(t.TransactionAmount))
                    })
                    .OrderByDescending(x => x.UnitsSold)
                    .Take(5)
                    .ToListAsync();

                // Fetch snack details for the best sellers
                var topSnackIds = bestSellers.Select(b => b.SnackId).ToList();
                var topSnacksDetails = await _context.Snacks
                    .Where(s => topSnackIds.Contains(s.SnackId))
                    .ToDictionaryAsync(s => s.SnackId, s => s.Name);

                var bestSellersResponse = bestSellers.Select(b => new
                {
                    SnackId = b.SnackId,
                    Name = b.SnackId.HasValue && topSnacksDetails.ContainsKey(b.SnackId.Value) 
                            ? topSnacksDetails[b.SnackId.Value] : "Unknown",
                    UnitsSold = b.UnitsSold,
                    Revenue = b.Revenue
                });

                // 3. Stagnant Inventory (Items in stock but not sold recently, or ever)
                // Get all active snacks
                var activeSnacks = await _context.Snacks
                    .Where(s => s.IsAvailable && s.Stock > 0)
                    .ToListAsync();

                // Find the date of the last transaction for each snack
                var lastSoldDates = await _context.Transactions
                    .Where(t => t.SnackId != null && t.TransactionAmount <= 0)
                    .GroupBy(t => t.SnackId)
                    .Select(g => new
                    {
                        SnackId = g.Key.Value,
                        LastSold = g.Max(t => t.Timestamp)
                    })
                    .ToDictionaryAsync(x => x.SnackId, x => x.LastSold);

                var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

                var stagnantInventory = activeSnacks
                    .Where(s => !lastSoldDates.ContainsKey(s.SnackId) || lastSoldDates[s.SnackId] < thirtyDaysAgo)
                    .Select(s => new
                    {
                        SnackId = s.SnackId,
                        Name = s.Name,
                        CurrentStock = s.Stock,
                        LastSoldDate = lastSoldDates.ContainsKey(s.SnackId) ? (DateTime?)lastSoldDates[s.SnackId] : null
                    })
                    .OrderByDescending(s => s.CurrentStock)
                    .Take(10)
                    .ToList();

                return Ok(new
                {
                    TotalRevenue = amountSpent,
                    TotalCreditsDistributed = creditsAdded,
                    BestSellers = bestSellersResponse,
                    StagnantInventory = stagnantInventory
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error generating store trends: " + ex.Message });
            }
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
