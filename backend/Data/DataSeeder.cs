// File: backend/Data/DataSeeder.cs

using SnackTracker.Api.Models;

namespace SnackTracker.Api.Data
{
    public static class DataSeeder
    {
        // This is an "extension method" that we can call on our app builder.
        public static void SeedDatabase(this IApplicationBuilder app)
        {
            // We need to get a 'scope' to access our services, like the DbContext.
            using (var scope = app.ApplicationServices.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<SnackTrackerContext>();

                // Check if there are any snacks in the database.
                if (!context.Snacks.Any())
                {
                    // If not, add a new one.
                    context.Snacks.Add(new Snack { Name = "Stroopwafel", Price = 1.50M, IsAvailable = true });
                }

                // Check if there are any users in the database.
                if (!context.Users.Any())
                {
                    // If not, add a new one.
                    context.Users.Add(new User { Email = "test.user@byui.edu", DisplayName = "Test User", Balance = 5.00M });
                }

                // Save any changes we might have made.
                context.SaveChanges();
            }
        }
    }
}
