import React, { useState, useEffect } from 'react';
import { Drawer, Box, Typography, List, ListItem, IconButton, Button, Divider, ButtonGroup, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { API_BASE_URL } from '../config';

// This component now has the real checkout logic
function Cart({ cart, setCart, open, onClose, user, updateUser, setPurchaseStatus, refreshSnacks }) {
  
  const [hasPurchasedWaterToday, setHasPurchasedWaterToday] = useState(false);

  // Check if user has already bought water today when cart opens
  useEffect(() => {
    if (open && user?.UserId) {
      checkWaterStatus();
    }
  }, [open, user]);

  const checkWaterStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Admin/user-transactions/${user.UserId}`, {
        headers: {
            'X-User-Id': user.UserId // Using admin header just for convenience to read their own log
        }
      });
      if (response.ok) {
        const transactions = await response.json();
        const today = new Date().toDateString();
        
        const boughtWaterToday = transactions.some(t => {
            if (!t.SnackName) return false;
            // Normalizing the transaction name and date
            const isWater = t.SnackName.toLowerCase() === 'water';
            const timestampDate = new Date(t.Timestamp).toDateString();
            return isWater && timestampDate === today;
        });

        setHasPurchasedWaterToday(boughtWaterToday);
      }
    } catch (err) {
      console.error("Failed to check water status", err);
    }
  };

  // Convert cart array to stacked items for display and calculations
  const stackedItems = cart.reduce((acc, item) => {
    const existingItem = acc.find(stackedItem => stackedItem.SnackId === item.SnackId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      acc.push({ ...item, quantity: 1 });
    }
    return acc;
  }, []);

  // Calculate total considering the Free Water rule
  let waterDiscountApplied = false;
  const total = stackedItems.reduce((sum, item) => {
      let itemPrice = typeof item.Price === 'number' ? item.Price : 0;
      let itemTotal = 0;

      if (item.Name.toLowerCase() === 'water' && !hasPurchasedWaterToday && !waterDiscountApplied) {
          // First water is free
          itemTotal = itemPrice * (item.quantity - 1); // 1 water is 0, rest are normal price
          waterDiscountApplied = true;
      } else {
          itemTotal = itemPrice * item.quantity;
      }

      return sum + itemTotal;
  }, 0);

  const isInsufficientFunds = user?.Balance < total;

  const handleRemoveOneFromCart = (snackIdToRemove) => {
    const indexToRemove = cart.findIndex(item => item.SnackId === snackIdToRemove);
    if (indexToRemove > -1) {
      const newCart = [...cart];
      newCart.splice(indexToRemove, 1);
      setCart(newCart);
    }
  };

  const handleRemoveAllFromCart = (snackIdToRemove) => {
    const newCart = cart.filter(item => item.SnackId !== snackIdToRemove);
    setCart(newCart);
  };

  const handleAddOneToCart = (snackToAdd, currentQuantity, maxStock) => {
    if (currentQuantity < maxStock) {
      setCart(prevCart => [...prevCart, snackToAdd]);
    }
  };

  // --- NEW CHECKOUT LOGIC ---
  const handleCheckout = async () => {
    // Create a list of just the Snack IDs to send to the backend.
    const snackIds = cart.map(item => item.SnackId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/snacks/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UserId: user.UserId,
          SnackIds: snackIds,
        }),
      });

      // Read body exactly once, then try to parse JSON
      const raw = await response.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch (_) { /* non-JSON body */ }

      if (!response.ok) {
        const message = data?.message || raw || 'Checkout failed.';
        throw new Error(message);
      }
      
      // 1. Update the user's balance in the main app state.
      const updatedUser = { ...user, Balance: data.newBalance };
      updateUser(updatedUser);

      // 2. Show a success message on the dashboard.
      setPurchaseStatus({ message: 'Checkout successful!', severity: 'success' });
      
      // 3. Refresh the main snack list to show the updated stock counts.
      refreshSnacks();

    } catch (error) {
      // Show an error message on the dashboard if anything goes wrong.
      setPurchaseStatus({ message: error.message, severity: 'error' });
    } finally {
      // Whether it succeeds or fails, always clear the cart and close the drawer.
      setCart([]);
      onClose();
    }
  };

  // Helper to determine display price of a cart item
  const getDisplayPrice = (item) => {
      let basePrice = typeof item.Price === 'number' ? item.Price : 0;
      
      if (item.Name.toLowerCase() === 'water' && !hasPurchasedWaterToday) {
          if (item.quantity === 1) return "$0.00 (Free Today)";
          return `$${(basePrice * (item.quantity - 1)).toFixed(2)} (1 Free)`;
      }

      return `$${(basePrice * item.quantity).toFixed(2)}`;
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 350, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }} role="presentation">
        <Typography variant="h5" component="div" sx={{ mb: 2 }}>
          Your Cart
        </Typography>
        <Divider />
        
        {cart.length === 0 ? (
          <Typography sx={{ mt: 2 }}>Your cart is empty.</Typography>
        ) : (
          <>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <List>
                {stackedItems.map((item) => (
                  <ListItem 
                    key={item.SnackId}
                    sx={{ 
                      flexDirection: 'column', 
                      alignItems: 'stretch',
                      pb: 2,
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 1 }}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {item.Name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ${(typeof item.Price === 'number' ? item.Price : 0).toFixed(2)} each
                        </Typography>
                      </Box>
                      <IconButton 
                        edge="end" 
                        aria-label="delete all" 
                        onClick={() => handleRemoveAllFromCart(item.SnackId)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <ButtonGroup variant="outlined" size="small">
                        <IconButton 
                          onClick={() => handleRemoveOneFromCart(item.SnackId)}
                          disabled={item.quantity <= 1}
                          size="small"
                        >
                          <RemoveIcon />
                        </IconButton>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          px: 2, 
                          border: '1px solid #ddd',
                          borderLeft: 'none',
                          borderRight: 'none',
                          minWidth: '60px',
                          justifyContent: 'center'
                        }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.quantity}
                          </Typography>
                        </Box>
                        <IconButton 
                          onClick={() => handleAddOneToCart(item, item.quantity, item.Stock)}
                          disabled={item.quantity >= item.Stock}
                          size="small"
                        >
                          <AddIcon />
                        </IconButton>
                      </ButtonGroup>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: item.Name.toLowerCase() === 'water' && !hasPurchasedWaterToday ? 'green' : '#1976d2' }}>
                        {getDisplayPrice(item)}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>

            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mt: 2, pb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1">Your Balance:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">${(user?.Balance || 0).toFixed(2)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6">${total.toFixed(2)}</Typography>
              </Box>

              {isInsufficientFunds && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                      Insufficient funds. Please add balance to checkout.
                  </Alert>
              )}

              <Button 
                variant="contained" 
                fullWidth 
                size="large"
                onClick={handleCheckout}
                disabled={cart.length === 0 || isInsufficientFunds}
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

