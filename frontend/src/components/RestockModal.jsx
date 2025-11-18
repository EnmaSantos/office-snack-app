import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box } from '@mui/material';
import { API_BASE_URL } from '../config';

function RestockModal({ open, onClose, snack, user, refreshSnacks }) {
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');

  if (!snack) return null;

  const handleClose = () => {
    setQuantity('');
    setTotalCost('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const qty = parseInt(quantity, 10);
    const cost = parseFloat(totalCost);

    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
      alert("Please enter valid quantity and cost.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/snacks/${snack.SnackId}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.UserId,
        },
        body: JSON.stringify({
          Quantity: qty,
          TotalCost: cost
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restock');
      }

      alert('Restock successful! Prices have been updated.');
      refreshSnacks();
      handleClose();
    } catch (error) {
      alert(error.message);
    }
  };

  // Calculate cost per unit for display
  const costPerUnit = (quantity && totalCost) ? (parseFloat(totalCost) / parseInt(quantity, 10)).toFixed(2) : '0.00';

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Restock {snack.Name}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Enter the details from your purchase receipt.
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Quantity Purchased"
            type="number"
            fullWidth
            variant="outlined"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            inputProps={{ min: 1 }}
          />
          
          <TextField
            margin="dense"
            label="Total Cost Paid ($)"
            type="number"
            fullWidth
            variant="outlined"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            required
            inputProps={{ min: 0, step: "0.01" }}
          />

          <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2">
              Calculated Cost Per Item: ${costPerUnit}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              The system will automatically calculate the new average price based on this cost and the existing inventory.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            Add Inventory & Recalculate
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default RestockModal;

