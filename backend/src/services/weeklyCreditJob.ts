// Weekly Credit Distribution Job — runs on a cron schedule
import cron from 'node-cron';
import { get, all, run } from '../db';
import { getSheetNames, getWeeklyHours, getMondayDateFromSheet } from './googleSheetsService';

/**
 * Get current time in MST (America/Denver).
 */
function getMstNow(): Date {
  const now = new Date();
  const mstString = now.toLocaleString('en-US', { timeZone: 'America/Denver' });
  return new Date(mstString);
}

/**
 * Format a date as YYYY-MM-DD for comparison.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Try to distribute credits for the given Monday date.
 */
async function tryDistributeCredits(mondayDate: Date): Promise<void> {
  const mondayStr = formatDate(mondayDate);

  // 1. Check if already distributed for this date
  const existing = get(
    "SELECT Id FROM DistributionLogs WHERE date(DistributedAt) = ?",
    [mondayStr]
  );

  if (existing) {
    console.log(`[CreditJob] Credits already distributed for ${mondayStr}. Skipping.`);
    return;
  }

  // 2. Find the correct week tab by checking D1 dates
  const sheetNames = await getSheetNames();
  const weekSheets = sheetNames.filter(n => n.toUpperCase().startsWith('W'));

  let matchingSheet: string | null = null;

  for (const sheet of weekSheets) {
    try {
      const sheetMonday = await getMondayDateFromSheet(sheet);
      if (sheetMonday && formatDate(sheetMonday) === mondayStr) {
        matchingSheet = sheet;
        break;
      }
    } catch (err: any) {
      console.warn(`[CreditJob] Error reading date from sheet ${sheet}:`, err.message);
    }
  }

  if (!matchingSheet) {
    console.warn(`[CreditJob] No week tab found with Monday date ${mondayStr}.`);
    return;
  }

  console.log(`[CreditJob] Found matching sheet: ${matchingSheet} for Monday ${mondayStr}.`);

  // 3. Fetch weekly hours and distribute credits
  try {
    const weeklyHours = await getWeeklyHours(matchingSheet);

    if (Object.keys(weeklyHours).length === 0) {
      console.warn(`[CreditJob] No hours found in sheet ${matchingSheet}.`);
      return;
    }

    let usersUpdated = 0;
    let totalCreditsDistributed = 0;

    const allUsers = all('SELECT * FROM Users');
    const now = new Date().toISOString();

    for (const [sheetName, hours] of Object.entries(weeklyHours)) {
      const creditsToAward = Math.floor(hours / 4) * 1.0;
      if (creditsToAward <= 0) continue;

      const user = allUsers.find(u =>
        u.DisplayName &&
        (u.DisplayName as string).toLowerCase() === sheetName.toLowerCase()
      );

      if (user) {
        run('UPDATE Users SET Balance = Balance + ? WHERE UserId = ?', [creditsToAward, user.UserId]);

        run(
          'INSERT INTO Transactions (UserId, SnackId, TransactionAmount, Timestamp) VALUES (?, NULL, ?, ?)',
          [user.UserId, creditsToAward, now]
        );

        usersUpdated++;
        totalCreditsDistributed += creditsToAward;
      }
    }

    // 4. Log the distribution
    run(
      'INSERT INTO DistributionLogs (WeekSheetName, DistributedAt, UsersUpdated, TotalAmount, IsAutomatic) VALUES (?, ?, ?, ?, 1)',
      [matchingSheet, now, usersUpdated, totalCreditsDistributed]
    );

    console.log(`[CreditJob] Auto-distributed $${totalCreditsDistributed} to ${usersUpdated} users from sheet ${matchingSheet}.`);
  } catch (err: any) {
    console.error(`[CreditJob] Error fetching hours from sheet ${matchingSheet}:`, err.message);
  }
}

/**
 * Start the cron job. Checks every minute; activates on Mondays 7:00-7:04 AM MST.
 */
export function startWeeklyCreditJob(): void {
  console.log('[CreditJob] Weekly credit distribution job started.');

  cron.schedule('* * * * *', async () => {
    try {
      const mstNow = getMstNow();

      if (mstNow.getDay() === 1 && mstNow.getHours() === 7 && mstNow.getMinutes() < 5) {
        const mondayDate = new Date(mstNow);
        mondayDate.setHours(0, 0, 0, 0);
        await tryDistributeCredits(mondayDate);
      }
    } catch (err: any) {
      console.error('[CreditJob] Error in cron tick:', err.message);
    }
  });
}
