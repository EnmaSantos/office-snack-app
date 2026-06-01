"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWeeklyCreditJob = startWeeklyCreditJob;
// Weekly Credit Distribution Job - runs on a cron schedule
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../db");
const googleSheetsService_1 = require("./googleSheetsService");
/**
 * Get current time in MST (America/Denver).
 */
function getMstNow() {
    const now = new Date();
    const mstString = now.toLocaleString('en-US', { timeZone: 'America/Denver' });
    return new Date(mstString);
}
/**
 * Format a date as YYYY-MM-DD for comparison.
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
/**
 * Try to distribute credits for the given Monday date.
 */
async function tryDistributeCredits(mondayDate) {
    const mondayStr = formatDate(mondayDate);
    // 1. Check if already distributed for this date
    const existing = (0, db_1.get)("SELECT Id FROM DistributionLogs WHERE date(DistributedAt) = ?", [mondayStr]);
    if (existing) {
        console.log(`[CreditJob] Credits already distributed for ${mondayStr}. Skipping.`);
        return;
    }
    // 2. Find the correct week tab by checking D1 dates
    const sheetNames = await (0, googleSheetsService_1.getSheetNames)();
    const weekSheets = sheetNames.filter(n => n.toUpperCase().startsWith('W'));
    let matchingSheet = null;
    for (const sheet of weekSheets) {
        try {
            const sheetMonday = await (0, googleSheetsService_1.getMondayDateFromSheet)(sheet);
            if (sheetMonday && formatDate(sheetMonday) === mondayStr) {
                matchingSheet = sheet;
                break;
            }
        }
        catch (err) {
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
        const weeklyHours = await (0, googleSheetsService_1.getWeeklyHours)(matchingSheet);
        if (Object.keys(weeklyHours).length === 0) {
            console.warn(`[CreditJob] No hours found in sheet ${matchingSheet}.`);
            return;
        }
        let usersUpdated = 0;
        let totalCreditsDistributed = 0;
        const allUsers = (0, db_1.all)('SELECT * FROM Users');
        const now = new Date().toISOString();
        for (const [sheetName, hours] of Object.entries(weeklyHours)) {
            const creditsToAward = Math.floor(hours / 4) * 1.0;
            if (creditsToAward <= 0)
                continue;
            const user = allUsers.find(u => u.DisplayName &&
                u.DisplayName.toLowerCase() === sheetName.toLowerCase());
            if (user) {
                (0, db_1.run)('UPDATE Users SET Balance = Balance + ? WHERE UserId = ?', [creditsToAward, user.UserId]);
                (0, db_1.run)('INSERT INTO Transactions (UserId, SnackId, TransactionAmount, Timestamp) VALUES (?, NULL, ?, ?)', [user.UserId, creditsToAward, now]);
                usersUpdated++;
                totalCreditsDistributed += creditsToAward;
            }
        }
        // 4. Log the distribution
        (0, db_1.run)('INSERT INTO DistributionLogs (WeekSheetName, DistributedAt, UsersUpdated, TotalAmount, IsAutomatic) VALUES (?, ?, ?, ?, 1)', [matchingSheet, now, usersUpdated, totalCreditsDistributed]);
        console.log(`[CreditJob] Auto-distributed $${totalCreditsDistributed} to ${usersUpdated} users from sheet ${matchingSheet}.`);
    }
    catch (err) {
        console.error(`[CreditJob] Error fetching hours from sheet ${matchingSheet}:`, err.message);
    }
}
/**
 * Start the cron job. Checks every minute; activates on Mondays 7:00-7:04 AM MST.
 */
function startWeeklyCreditJob() {
    console.log('[CreditJob] Weekly credit distribution job started.');
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            const mstNow = getMstNow();
            if (mstNow.getDay() === 1 && mstNow.getHours() === 7 && mstNow.getMinutes() < 5) {
                const mondayDate = new Date(mstNow);
                mondayDate.setHours(0, 0, 0, 0);
                await tryDistributeCredits(mondayDate);
            }
        }
        catch (err) {
            console.error('[CreditJob] Error in cron tick:', err.message);
        }
    });
}
