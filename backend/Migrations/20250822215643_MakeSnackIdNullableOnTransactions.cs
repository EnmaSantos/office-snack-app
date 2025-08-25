using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SnackTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class MakeSnackIdNullableOnTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Snacks_SnackId",
                table: "Transactions");

            // First make the column nullable
            migrationBuilder.AlterColumn<int>(
                name: "SnackId",
                table: "Transactions",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            // Now clean up any orphaned SnackId references
            migrationBuilder.Sql(@"UPDATE Transactions 
SET SnackId = NULL 
WHERE SnackId IS NOT NULL 
  AND SnackId NOT IN (SELECT SnackId FROM Snacks);");

            // Re-add the FK without cascade and allow nulls
            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Snacks_SnackId",
                table: "Transactions",
                column: "SnackId",
                principalTable: "Snacks",
                principalColumn: "SnackId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Snacks_SnackId",
                table: "Transactions");

            migrationBuilder.AlterColumn<int>(
                name: "SnackId",
                table: "Transactions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Snacks_SnackId",
                table: "Transactions",
                column: "SnackId",
                principalTable: "Snacks",
                principalColumn: "SnackId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
