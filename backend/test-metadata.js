const https = require('https');

const apiKey = 'AIzaSyD0wkHBEwtOpTXUD0JDNQDYYVY5ictqoDE'; // The key the user provided earlier
const spreadsheetId = '1UfBYzIIix1Wu7XcBNkb6jqopb1ihi5Ymr9ONbDgXAls';

async function getSheetNames() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - Make sure the sheet is public.`);
    }

    const data = await response.json();
    const sheetNames = data.sheets.map(sheet => sheet.properties.title);

    console.log("\n--- SUCCESS ---");
    console.log("Sheet Names found in Document:");
    sheetNames.forEach(name => console.log(`- ${name}`));
    console.log("---------------\n");
    return sheetNames;

  } catch (error) {
    console.error("Error fetching spreadsheet data:", error);
  }
}

getSheetNames();
