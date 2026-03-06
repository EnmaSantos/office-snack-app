using System.Text.Json;
using System.Text.Json.Serialization;

namespace SnackTracker.Api.Services
{
    public class GoogleSheetsService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _spreadsheetId;

        public GoogleSheetsService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GoogleSheets:ApiKey"] ?? throw new InvalidOperationException("GoogleSheets:ApiKey is not configured.");
            _spreadsheetId = configuration["GoogleSheets:SpreadsheetId"] ?? throw new InvalidOperationException("GoogleSheets:SpreadsheetId is not configured.");
        }

        public async Task<List<string>> GetSheetNamesAsync()
        {
            var url = $"https://sheets.googleapis.com/v4/spreadsheets/{_spreadsheetId}?key={_apiKey}";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(content);
            
            var sheetNames = new List<string>();
            if (doc.RootElement.TryGetProperty("sheets", out var sheets))
            {
                foreach (var sheet in sheets.EnumerateArray())
                {
                    if (sheet.TryGetProperty("properties", out var props) && 
                        props.TryGetProperty("title", out var title))
                    {
                        var name = title.GetString();
                        if (!string.IsNullOrEmpty(name))
                        {
                            sheetNames.Add(name);
                        }
                    }
                }
            }
            return sheetNames;
        }

        public async Task<Dictionary<string, decimal>> GetWeeklyHoursAsync(string sheetName)
        {
            // Wrap sheet name in single quotes so the API treats it as a tab name,
            // not a cell reference (e.g., 'W11' sheet vs W11 cell).
            var quotedRange = $"'{sheetName}'";
            var encodedRange = Uri.EscapeDataString(quotedRange);
            var url = $"https://sheets.googleapis.com/v4/spreadsheets/{_spreadsheetId}/values/{encodedRange}?key={_apiKey}";
            
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(content);
            
            var result = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

            if (doc.RootElement.TryGetProperty("values", out var values))
            {
                foreach (var row in values.EnumerateArray())
                {
                    if (row.GetArrayLength() >= 2)
                    {
                        var name = row[0].GetString()?.Trim();
                        var hoursStr = row[1].GetString()?.Trim();

                        // Only process rows where Name is not empty and Hours is a valid number
                        if (!string.IsNullOrEmpty(name) && decimal.TryParse(hoursStr, out var hours))
                        {
                            result[name] = hours;
                        }
                    }
                }
            }

            return result;
        }
    }
}
