// File: backend/Data/DataSeeder.cs

using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using SnackTracker.Api.Models;
using Microsoft.Extensions.Hosting;

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
                var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();

                // Apply any pending migrations (safer than EnsureCreated)
                // This will only apply new migrations, not recreate existing data
                context.Database.Migrate();

                // Only seed default snacks on first run in development (do not modify existing data)
                if (env.IsDevelopment() && !context.Snacks.Any())
                {
                    var desiredSnacks = new List<Snack>
                    {
                        new Snack { Name = "Assorted Nuts", Price = 0.50M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Chips (Frito, Dorito, Ruffles, Cheetos)", Price = 0.50M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Chocolate Candy Bars (Kinder, M&M, Twix, M&M)", Price = 0.50M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Corn Dogs", Price = 1.00M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Granola Bars", Price = 0.25M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Gummy Bears", Price = 0.25M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Hot Pockets", Price = 0.25M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Jerkey Sticks", Price = 0.75M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Monster Energy Drinks", Price = 1.25M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Oatmeal", Price = 0.25M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Oreos, Chips Ahoy, Nilla Wafers", Price = 0.50M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Popcorn", Price = 0.35M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Pretzels & Goldfish", Price = 0.00M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Protein Bars", Price = 1.50M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Ramen", Price = 0.25M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Rice Krispy", Price = 0.50M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "String Cheese", Price = 0.25M, Stock = 10, IsAvailable = true },
                        new Snack { Name = "Velveeta Mac n Cheese", Price = 0.00M, Stock = 10, IsAvailable = true },
                    };

                    context.Snacks.AddRange(desiredSnacks);
                }

                // Only seed a test user in development on first run
                if (env.IsDevelopment() && !context.Users.Any())
                {
                    context.Users.Add(new User { Email = "test.user@byui.edu", DisplayName = "Test User", Balance = 5.00M });
                }

                // Save any changes we might have made.
                context.SaveChanges();
            }
        }
    }
}
