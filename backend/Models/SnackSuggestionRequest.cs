using System.ComponentModel.DataAnnotations;

namespace SnackTracker.Api.Models
{
    public class SnackSuggestionRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
    }
}
