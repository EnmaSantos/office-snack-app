using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;

namespace SnackTracker.Api.Services
{
    /// <summary>
    /// Background service that automatically distributes weekly credits
    /// every Monday at 7:00 AM MST (Mountain Standard Time / America/Denver).
    /// </summary>
    public class WeeklyCreditDistributionJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<WeeklyCreditDistributionJob> _logger;
        private static readonly TimeZoneInfo MstTimeZone = GetMstTimeZone();

        private static TimeZoneInfo GetMstTimeZone()
        {
            // Windows uses "Mountain Standard Time", Linux uses "America/Denver"
            try { return TimeZoneInfo.FindSystemTimeZoneById("Mountain Standard Time"); }
            catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("America/Denver"); }
        }

        public WeeklyCreditDistributionJob(IServiceProvider serviceProvider, ILogger<WeeklyCreditDistributionJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WeeklyCreditDistributionJob started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var mstNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, MstTimeZone);

                    // Check: is it Monday, between 7:00 and 7:04 AM MST?
                    if (mstNow.DayOfWeek == DayOfWeek.Monday && mstNow.Hour == 7 && mstNow.Minute < 5)
                    {
                        await TryDistributeCreditsAsync(mstNow.Date, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in WeeklyCreditDistributionJob tick.");
                }

                // Check every 60 seconds
                await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
            }

            _logger.LogInformation("WeeklyCreditDistributionJob stopped.");
        }

        private async Task TryDistributeCreditsAsync(DateTime mondayDate, CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SnackTrackerContext>();
            var sheetsService = scope.ServiceProvider.GetRequiredService<GoogleSheetsService>();

            // 1. Check if we already distributed for any sheet matching this Monday
            var mondayDateOnly = mondayDate.Date;
            var alreadyDistributed = await context.DistributionLogs
                .AnyAsync(d => d.DistributedAt.Date == mondayDateOnly, stoppingToken);

            if (alreadyDistributed)
            {
                _logger.LogInformation("Credits already distributed for {Date}. Skipping.", mondayDateOnly.ToString("yyyy-MM-dd"));
                return;
            }

            // 2. Find the correct week tab by checking D1 dates
            var sheetNames = await sheetsService.GetSheetNamesAsync();
            var weekSheets = sheetNames.Where(n => n.ToUpper().StartsWith("W")).ToList();

            string? matchingSheet = null;

            foreach (var sheet in weekSheets)
            {
                try
                {
                    var sheetMonday = await sheetsService.GetMondayDateFromSheetAsync(sheet);
                    if (sheetMonday.HasValue && sheetMonday.Value.Date == mondayDateOnly)
                    {
                        matchingSheet = sheet;
                        break;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error reading date from sheet {Sheet}. Skipping.", sheet);
                }
            }

            if (matchingSheet == null)
            {
                _logger.LogWarning("No week tab found with Monday date {Date}.", mondayDateOnly.ToString("yyyy-MM-dd"));
                return;
            }

            _logger.LogInformation("Found matching sheet: {Sheet} for Monday {Date}.", matchingSheet, mondayDateOnly.ToString("yyyy-MM-dd"));

            // 3. Fetch weekly hours and distribute credits
            try
            {
                var weeklyHours = await sheetsService.GetWeeklyHoursAsync(matchingSheet);

                if (weeklyHours.Count == 0)
                {
                    _logger.LogWarning("No hours found in sheet {Sheet}.", matchingSheet);
                    return;
                }

                int usersUpdated = 0;
                decimal totalCreditsDistributed = 0;

                using var dbTransaction = await context.Database.BeginTransactionAsync(stoppingToken);

                try
                {
                    var allUsers = await context.Users.ToListAsync(stoppingToken);

                    foreach (var kvp in weeklyHours)
                    {
                        var sheetName = kvp.Key;
                        var hours = kvp.Value;

                        // $1 per 4 hours (rounded down to nearest multiple of 4)
                        var creditsToAward = Math.Floor(hours / 4.0m) * 1.00m;
                        if (creditsToAward <= 0) continue;

                        var user = allUsers.FirstOrDefault(u =>
                            !string.IsNullOrEmpty(u.DisplayName) &&
                            u.DisplayName.Equals(sheetName, StringComparison.OrdinalIgnoreCase));

                        if (user != null)
                        {
                            user.Balance += creditsToAward;

                            var depositTransaction = new Transaction
                            {
                                UserId = user.UserId,
                                SnackId = null,
                                TransactionAmount = creditsToAward,
                                Timestamp = DateTime.UtcNow
                            };
                            context.Transactions.Add(depositTransaction);

                            usersUpdated++;
                            totalCreditsDistributed += creditsToAward;
                        }
                    }

                    // 4. Log the distribution
                    context.DistributionLogs.Add(new DistributionLog
                    {
                        WeekSheetName = matchingSheet,
                        DistributedAt = DateTime.UtcNow,
                        UsersUpdated = usersUpdated,
                        TotalAmount = totalCreditsDistributed,
                        IsAutomatic = true
                    });

                    await context.SaveChangesAsync(stoppingToken);
                    await dbTransaction.CommitAsync(stoppingToken);

                    _logger.LogInformation(
                        "Auto-distributed ${Total} to {Count} users from sheet {Sheet}.",
                        totalCreditsDistributed, usersUpdated, matchingSheet);
                }
                catch (Exception dbEx)
                {
                    await dbTransaction.RollbackAsync(stoppingToken);
                    _logger.LogError(dbEx, "Database error during auto-distribution for sheet {Sheet}.", matchingSheet);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching hours from sheet {Sheet}.", matchingSheet);
            }
        }
    }
}
