using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SnackTracker.Api.Models
{
    public class SnackRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string SnackName { get; set; } = string.Empty;

        public DateTime RequestDate { get; set; }

        public string Status { get; set; } = "Pending"; // e.g., "Pending", "Approved", "Purchased"

        // Foreign key for User
        public int RequestedByUserId { get; set; }

        // Navigation property
        [ForeignKey("RequestedByUserId")]
        public User? RequestedByUser { get; set; }
    }
}
