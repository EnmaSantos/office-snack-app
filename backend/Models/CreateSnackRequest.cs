using System.ComponentModel.DataAnnotations;

namespace SnackTracker.Api.Models
{
    public class CreateSnackRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int InitialStock { get; set; }

        // We now take TotalCost instead of Price for new snacks
        [Required]
        public decimal TotalCost { get; set; }

        public string? ImageUrl { get; set; }
        public bool IsAvailable { get; set; } = true;
    }
}
