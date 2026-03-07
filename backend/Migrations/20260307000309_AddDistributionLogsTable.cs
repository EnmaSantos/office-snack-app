using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SnackTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDistributionLogsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DistributionLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WeekSheetName = table.Column<string>(type: "TEXT", nullable: false),
                    DistributedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UsersUpdated = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    IsAutomatic = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DistributionLogs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DistributionLogs");
        }
    }
}
