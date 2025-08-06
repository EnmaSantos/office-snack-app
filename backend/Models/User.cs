using System.ComponentModel.DataAnnotations;

namespace SnackTracker.Api.Models
{
    public class User
    {
        [Key]
        public int UserId { get; set; }

        [Required]
        [EmailAddress]
        // FIX: Initialize to an empty string to satisfy the compiler.
        public string Email { get; set; } = string.Empty;

        public string? DisplayName { get; set; }

        public decimal Balance { get; set; } = 0.00M;

        public bool IsAdmin { get; set; } = false;
    }
}