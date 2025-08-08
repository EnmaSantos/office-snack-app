using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SnackTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStockAndImageUrlToSnacks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Snacks",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Stock",
                table: "Snacks",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Snacks");

            migrationBuilder.DropColumn(
                name: "Stock",
                table: "Snacks");
        }
    }
}
