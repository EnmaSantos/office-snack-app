const https = require('https');

const SHEET_ID = '1UfBYzIIix1Wu7XcBNkb6jqopb1ihi5Ymr9ONbDgXAls';
const SHEET_NAME = 'Week 9'; // We can change this to Week 1, Week 2, etc.
const API_KEY = 'AIzaSyD0wkHBEwtOpTXUD0JDNQDYYVY5ictqoDE'; // From the user

// Google Sheets API URL format:
// https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}?key={API_KEY}
// The range is just the name of the sheet, e.g. 'Week 9'

const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;

console.log("Fetching data from: " + url.replace(API_KEY, 'HIDDEN_API_KEY'));

https.get(url, (res) => {
    let rawData = '';
    res.on('data', chunk => rawData += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(rawData);
            
            if (data.error) {
                console.error("API Error:");
                console.error(data.error.message);
                return;
            }

            if (!data.values || data.values.length === 0) {
                console.log('No data found in this sheet.');
                return;
            }

            console.log("\n--- SUCCESS! First 5 rows of data ---");
            // The first few rows might be headers or empty, let's just print the first 10
            const rowsToPrint = Math.min(10, data.values.length);
            for (let i = 0; i < rowsToPrint; i++) {
                const row = data.values[i];
                // Column A is index 0, Column B is index 1
                const name = row[0] || '';
                const hours = row[1] || '';
                
                // Only print if it looks like an employee row (has a name and some hours or shift times)
                if (name.trim() !== '') {
                    console.log(`Row ${i+1}: Name = "${name}", Hours = "${hours}"`);
                }
            }
            console.log("-------------------------------------");

        } catch (e) {
            console.error("Error parsing JSON response:");
            console.error(e.message);
        }
    });
}).on('error', (e) => {
    console.error(`Request Error: ${e.message}`);
});
