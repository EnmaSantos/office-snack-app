// File: backend/Controllers/AdjustBalanceRequest.cs

namespace SnackTracker.Api.Controllers
{
    public class AdjustBalanceRequest
    {
        public int UserId { get; set; }
        public decimal Amount { get; set; }
    }

    public class ToggleAdminStatusRequest
    {
        public int UserId { get; set; }
    }
}
