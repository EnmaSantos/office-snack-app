using System.ComponentModel.DataAnnotations;

namespace SnackTracker.Api.Models
{
    public class DistributionLog
    {
        [Key]
        public int Id { get; set; }

        /// <summary>The Google Sheet tab name (e.g., "W09")</summary>
        public string WeekSheetName { get; set; } = string.Empty;

        /// <summary>When the distribution was executed</summary>
        public DateTime DistributedAt { get; set; }

        /// <summary>Number of users who received credits</summary>
        public int UsersUpdated { get; set; }

        /// <summary>Total dollar amount distributed</summary>
        public decimal TotalAmount { get; set; }

        /// <summary>True if run by the scheduled job, false if triggered manually by admin</summary>
        public bool IsAutomatic { get; set; }
    }
}
