const https = require('https');

const SHEET_ID = '1UfBYzIIix1Wu7XcBNkb6jqopb1ihi5Ymr9ONbDgXAls';
const SHEET_NAME = 'Week 9'; // Dynamically change this

function fetchCsv(url) {
    https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log("Redirecting to: " + res.headers.location);
            fetchCsv(res.headers.location);
            return;
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("\n--- CSV DATA (First 500 chars) ---");
            console.log(data.substring(0, 500));
            console.log("----------------------------------\n");
            
            // Simple parsing to find Alyce or Benny
            const lines = data.split('\n');
            let foundEmployees = 0;
            for (let line of lines) {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const hours = parts[1].trim();
                    // Just look for some names as proof it worked
                    if (hours && !isNaN(parseFloat(hours)) && name.includes(' ')) {
                        console.log(`Found: ${name} - ${hours} hours`);
                        foundEmployees++;
                    }
                }
                if (foundEmployees >= 2) break;
            }
        });
    }).on('error', (e) => {
        console.error("Error:", e);
    });
}

const initialUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
console.log("Fetching: " + initialUrl);
fetchCsv(initialUrl);
