import React from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, CardMedia } from '@mui/material';

// This component now receives everything it needs to make a purchase and update the state.
function SnackList({ snacks, setSnacks, user, updateUser, setPurchaseStatus }) {
  
  const handlePurchase = async (snackId) => {
    try {
      const response = await fetch('http://localhost:5106/api/snacks/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.UserId,
          snackId: snackId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If the API returns an error, show an error message.
        throw new Error(data.message || 'Purchase failed.');
      }

      // --- UPDATE STATE ON SUCCESS ---
      // 1. Update the user's balance.
      const updatedUser = { ...user, Balance: data.newBalance };
      updateUser(updatedUser);

      // 2. Update the stock of the purchased snack in our local list.
      const updatedSnacks = snacks.map(s => 
        s.SnackId === snackId ? { ...s, Stock: s.Stock - 1 } : s
      );
      setSnacks(updatedSnacks);

      // 3. Show a success message.
      setPurchaseStatus({ message: 'Purchase successful!', severity: 'success' });

    } catch (error) {
      // Show an error message if the purchase fails.
      setPurchaseStatus({ message: error.message, severity: 'error' });
    } finally {
        // Clear the message after 3 seconds
        setTimeout(() => setPurchaseStatus({ message: '', severity: 'success'}), 3000);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Available Snacks</Typography>
      <Grid container spacing={3}>
        {snacks.map((snack) => (
          <Grid item xs={12} sm={6} md={4} key={snack.SnackId}>
            <Card>
              {/* --- NEW IMAGE DISPLAY --- */}
              <CardMedia
                component="img"
                height="140"
                image={snack.ImageUrl || "https://via.placeholder.com/150?text=No+Image"} // Use placeholder if no image
                alt={snack.Name}
              />
              <CardContent>
                <Typography variant="h5" component="div">
                  {snack.Name}
                </Typography>
                <Typography color="text.secondary">
                  ${snack.Price.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Stock: {snack.Stock}
                </Typography>
                <Button 
                  variant="contained" 
                  fullWidth
                  sx={{ mt: 1 }}
                  onClick={() => handlePurchase(snack.SnackId)}
                  // Disable the button if the snack is out of stock
                  disabled={snack.Stock <= 0}
                >
                  {snack.Stock > 0 ? 'Buy' : 'Out of Stock'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default SnackList;
