// File: backend/Models/Snack.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SnackTracker.Api.Models
{
    public class Snack
    {
        [Key]
        public int SnackId { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public bool IsAvailable { get; set; } = true;

        // --- NEW PROPERTIES ---

        // The current stock level of the snack. Defaults to 0.
        public int Stock { get; set; } = 0;

        // The URL for the snack's image. This is nullable ('string?'),
        // so it's an optional field.
        public string? ImageUrl { get; set; }
    }
}
