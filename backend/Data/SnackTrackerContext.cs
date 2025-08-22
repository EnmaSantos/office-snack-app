using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Models; // We need to 'use' our Models namespace to access our classes.

namespace SnackTracker.Api.Data
{
    // Our context class inherits from DbContext, which gives it all its database management powers.
    public class SnackTrackerContext : DbContext
    {
        // This is a special constructor required by Entity Framework.
        // It's how we'll pass in the configuration, like the database connection string, from our Program.cs file later.
        public SnackTrackerContext(DbContextOptions<SnackTrackerContext> options) : base(options)
        {
        }

        // These properties are the most important part.
        // Each DbSet<T> property tells Entity Framework that we want a table in our database
        // based on the model class 'T'.

        // This will create a 'Users' table from our 'User' model.
        public DbSet<User> Users { get; set; }

        // This will create a 'Snacks' table from our 'Snack' model.
        public DbSet<Snack> Snacks { get; set; }

        // This will create a 'Transactions' table from our 'Transaction' model.
        public DbSet<Transaction> Transactions { get; set; }

        // This will create a 'SnackRequests' table from our 'SnackRequest' model.
        public DbSet<SnackRequest> SnackRequests { get; set; }
    }
}