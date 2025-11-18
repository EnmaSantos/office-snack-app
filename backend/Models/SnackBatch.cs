using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SnackTracker.Api.Models
{
    public class SnackBatch
    {
        [Key]
        public int SnackBatchId { get; set; }

        [Required]
        public int SnackId { get; set; }

        // The cost paid per individual item in this batch
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitCost { get; set; }

        // How many items were originally bought in this batch
        [Required]
        public int QuantityPurchased { get; set; }

        // How many items from this batch are currently still in the machine
        [Required]
        public int QuantityRemaining { get; set; }

        [Required]
        public DateTime PurchaseDate { get; set; }

        // Navigation property back to the Snack
        [ForeignKey("SnackId")]
        public Snack Snack { get; set; } = null!;
    }
}

