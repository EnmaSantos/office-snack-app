"use strict";
// Google Sheets Service - reads data from Google Sheets API v4
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSheetNames = getSheetNames;
exports.getWeeklyHours = getWeeklyHours;
exports.getMondayDateFromSheet = getMondayDateFromSheet;
/**
 * Fetch spreadsheet metadata to get all sheet/tab names.
 */
async function getSheetNames() {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Google Sheets API error: ${response.statusText}`);
    const data = await response.json();
    const names = [];
    if (data.sheets) {
        for (const sheet of data.sheets) {
            const title = sheet.properties?.title;
            if (title)
                names.push(title);
        }
    }
    return names;
}
/**
 * Read weekly hours from a specific sheet tab.
 * Returns an object mapping name -> hours (number).
 */
async function getWeeklyHours(sheetName) {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const quotedRange = `'${sheetName}'`;
    const encodedRange = encodeURIComponent(quotedRange);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Google Sheets API error: ${response.statusText}`);
    const data = await response.json();
    const result = {};
    if (data.values) {
        for (const row of data.values) {
            if (row.length >= 2) {
                const name = (row[0] || '').trim();
                const hoursStr = (row[1] || '').trim();
                const hours = parseFloat(hoursStr);
                if (name && !isNaN(hours)) {
                    result[name] = hours;
                }
            }
        }
    }
    return result;
}
/**
 * Read cell D1 from a sheet tab to get the Monday date for that week.
 * Returns a Date object or null.
 */
async function getMondayDateFromSheet(sheetName) {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = `'${sheetName}'!D1`;
    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok)
        return null;
    const data = await response.json();
    if (data.values && data.values.length > 0 && data.values[0].length > 0) {
        const dateStr = (data.values[0][0] || '').trim();
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return null;
}
