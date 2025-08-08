import React from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, CardMedia } from '@mui/material';

function SnackList({ snacks, setSnacks, user, updateUser, setPurchaseStatus }) {
  
  const handlePurchase = async (snackId) => {
    try {
      const response = await fetch('http://localhost:5106/api/snacks/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UserId: user.UserId,
          snackId: snackId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Purchase failed.');
      }

      const updatedUser = { ...user, balance: data.newBalance };
      updateUser(updatedUser);

      const updatedSnacks = snacks.map(s => 
        s.snackId === snackId ? { ...s, stock: s.stock - 1 } : s
      );
      setSnacks(updatedSnacks);

      setPurchaseStatus({ message: 'Purchase successful!', severity: 'success' });

    } catch (error) {
      setPurchaseStatus({ message: error.message, severity: 'error' });
    } finally {
        setTimeout(() => setPurchaseStatus({ message: '', severity: 'success'}), 3000);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Available Snacks</Typography>
      <Grid container spacing={3}>
        {snacks.map((snack) => (
          <Grid xs={12} sm={6} md={4} key={snack.snackId}> 
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={snack.imageUrl || "https://placehold.co/150x140?text=No+Image"}
                alt={snack.name}
              />
              <CardContent>
                <Typography variant="h5" component="div">
                  {snack.name}
                </Typography>
                <Typography color="text.secondary">
                  ${typeof snack.price === 'number' ? snack.price.toFixed(2) : '0.00'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Stock: {snack.stock}
                </Typography>
                <Button 
                  variant="contained" 
                  fullWidth
                  sx={{ mt: 1 }}
                  onClick={() => handlePurchase(snack.snackId)}
                  disabled={snack.stock <= 0}
                >
                  {/* --- FIX --- */}
                  {/* The button text is now always "Buy" */}
                  Buy
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
