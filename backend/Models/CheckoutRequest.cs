namespace SnackTracker.Api.Models
{
    public class CheckoutRequest
    {
        public int UserId { get; set; }
        public List<int> SnackIds { get; set; } = new List<int>();
    }
}

