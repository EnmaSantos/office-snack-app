using System.ComponentModel.DataAnnotations;

namespace SnackTracker.Api.Models
{
    public class CreateSnackRequest
    {
        [Required]
        public string SnackName { get; set; } = string.Empty;
    }
}
