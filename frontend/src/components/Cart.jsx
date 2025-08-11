import React from 'react';
import { Drawer, Box, Typography, List, ListItem, ListItemText, IconButton, Button, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// This is a new component to display the shopping cart.
function Cart({ cart, setCart, open, onClose, user, updateUser }) {
  
  // Calculate the total price of items in the cart
  const total = cart.reduce((sum, item) => sum + (item.Price || 0), 0);

  const handleRemoveFromCart = (snackIdToRemove) => {
    // Find the first item with the matching ID and remove it
    const indexToRemove = cart.findIndex(item => item.SnackId === snackIdToRemove);
    if (indexToRemove > -1) {
      const newCart = [...cart];
      newCart.splice(indexToRemove, 1);
      setCart(newCart);
    }
  };

  const handleCheckout = async () => {
    if (!user) return;
    if (cart.length === 0) return onClose();

    try {
      const response = await fetch('http://localhost:5106/api/snacks/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          UserId: user.UserId,
          SnackIds: cart.map(item => item.SnackId),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.message || 'Checkout failed.';
        alert(message);
        return;
      }

      // Update user balance in local state/storage via parent
      if (typeof data.newBalance === 'number') {
        updateUser({ ...user, Balance: data.newBalance });
      }

      setCart([]);
      onClose();
    } catch (err) {
      alert('An unexpected error occurred during checkout.');
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 350, p: 2 }} role="presentation">
        <Typography variant="h5" component="div" sx={{ mb: 2 }}>
          Your Cart
        </Typography>
        <Divider />
        {cart.length === 0 ? (
          <Typography sx={{ mt: 2 }}>Your cart is empty.</Typography>
        ) : (
          <>
            <List>
              {cart.map((item, index) => (
                <ListItem 
                  key={`${item.SnackId}-${index}`}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFromCart(item.SnackId)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText 
                    primary={item.Name} 
                    secondary={`$${(item.Price || 0).toFixed(2)}`} 
                  />
                </ListItem>
              ))}
            </List>
            <Divider />
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">
                Total: ${total.toFixed(2)}
              </Typography>
              <Button 
                variant="contained" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={handleCheckout}
              >
                Checkout
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}

export default Cart;

