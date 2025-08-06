using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SnackTracker.Api.Models
{
    public class Snack
    {
        [Key]
        public int SnackId { get; set; }

        [Required]
        // FIX: Initialize to an empty string to satisfy the compiler.
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public bool IsAvailable { get; set; } = true;
    }
}