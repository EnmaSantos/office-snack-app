// File: backend/Models/ShoppingListRequest.cs

using System.ComponentModel.DataAnnotations;

namespace SnackTracker.Api.Models
{
    public class ShoppingListRequest
    {
        [Required]
        public List<ShoppingListItem> Items { get; set; } = new List<ShoppingListItem>();
    }

    public class ShoppingListItem
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public int Quantity { get; set; } = 1;

        public bool IsExistingSnack { get; set; } = false;

        public int? SnackId { get; set; }

        public string? Notes { get; set; }
    }
}
