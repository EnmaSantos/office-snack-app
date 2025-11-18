using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SnackTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSnackBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SnackBatches",
                columns: table => new
                {
                    SnackBatchId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SnackId = table.Column<int>(type: "INTEGER", nullable: false),
                    UnitCost = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    QuantityPurchased = table.Column<int>(type: "INTEGER", nullable: false),
                    QuantityRemaining = table.Column<int>(type: "INTEGER", nullable: false),
                    PurchaseDate = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SnackBatches", x => x.SnackBatchId);
                    table.ForeignKey(
                        name: "FK_SnackBatches_Snacks_SnackId",
                        column: x => x.SnackId,
                        principalTable: "Snacks",
                        principalColumn: "SnackId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SnackBatches_SnackId",
                table: "SnackBatches",
                column: "SnackId");

            // Backfill existing stock as initial batches
            migrationBuilder.Sql(
                @"INSERT INTO SnackBatches (SnackId, UnitCost, QuantityPurchased, QuantityRemaining, PurchaseDate)
                  SELECT SnackId, Price, Stock, Stock, datetime('now')
                  FROM Snacks
                  WHERE Stock > 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SnackBatches");
        }
    }
}
