using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SnackTracker.Api.Models
{
    public class Transaction
    {
        [Key]
        public int TransactionId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public int SnackId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TransactionAmount { get; set; }

        [Required]
        public DateTime Timestamp { get; set; }

        // FIX: Use the null-forgiving operator (!) to tell the compiler
        // that we know these will be populated by Entity Framework.
        public User User { get; set; } = null!;
        public Snack Snack { get; set; } = null!;
    }
}
