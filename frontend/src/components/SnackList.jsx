import React from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, CardMedia } from '@mui/material';

// The component now works with the cart state
function SnackList({ snacks, cart, setCart }) {
  const handleAddToCart = (snackToAdd) => {
    // Add the selected snack to the cart array in the parent component's state
    setCart(prevCart => [...prevCart, snackToAdd]);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Available Snacks</Typography>
      <Grid container spacing={3}>
        {snacks.map((snack, index) => (
          <Grid xs={12} sm={6} md={4} key={snack.SnackId ?? index}> 
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={snack.ImageUrl || "https://via.placeholder.com/150?text=No+Image"}
                alt={snack.Name}
              />
              <CardContent>
                <Typography variant="h5" component="div">
                  {snack.Name}
                </Typography>
                <Typography color="text.secondary">
                  ${typeof snack.Price === 'number' ? snack.Price.toFixed(2) : '0.00'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Stock: {snack.Stock}
                </Typography>
                <Button 
                  variant="contained" 
                  fullWidth
                  sx={{ mt: 1 }}
                  onClick={() => handleAddToCart(snack)}
                  disabled={snack.Stock <= 0}
                >
                  Add to Cart
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
