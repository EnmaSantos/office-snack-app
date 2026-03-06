using System.Text.Json;
using System.Text.Json.Serialization;

namespace SnackTracker.Api.Services
{
    public class GoogleSheetsService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey = "AIzaSyD0wkHBEwtOpTXUD0JDNQDYYVY5ictqoDE";
        private readonly string _spreadsheetId = "1UfBYzIIix1Wu7XcBNkb6jqopb1ihi5Ymr9ONbDgXAls";

        public GoogleSheetsService(HttpClient httpClient)
        {
            _httpClient = httpClient;
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
            // Range is just the sheet name. E.g., "W09"
            var encodedSheetName = Uri.EscapeDataString(sheetName);
            var url = $"https://sheets.googleapis.com/v4/spreadsheets/{_spreadsheetId}/values/{encodedSheetName}?key={_apiKey}";
            
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
