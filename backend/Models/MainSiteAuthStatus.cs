namespace SnackTracker.Api.Models
{
    public class MainSiteAuthStatus
    {
        public bool IsAuthenticated { get; set; }
        public MainSiteUser? User { get; set; }
    }

    public class MainSiteUser
    {
        public string? GoogleId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? ProfilePhoto { get; set; }
    }
}

