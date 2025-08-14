import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Link, Box, TextField, Alert } from '@mui/material';

// This component is now a form for adding balance.
function AddBalanceModal({ open, onClose, user, updateUser }) {
  const paymentUrl = "https://commerce.cashnet.com/BYUIFTC";
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleAddBalance = async () => {
    setError('');
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive number.");
      return;
    }

    try {
        const response = await fetch('http://localhost:5106/api/users/add-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                Amount: numericAmount,
            }),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to update balance. Please try again or contact an admin.');
        }

        const data = await response.json();
        updateUser({ ...user, Balance: data.newBalance });
        setAmount('');
        onClose();

    } catch (err) {
        setError(err.message);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Funds to Your Account</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          To add funds, please first use the official BYU-Idaho payment portal.
        </Typography>
        <Box sx={{ my: 2 }}>
          <Link href={paymentUrl} target="_blank" rel="noopener noreferrer" variant="body1">
            {paymentUrl}
          </Link>
        </Box>
        <Typography sx={{ mt: 2, fontWeight: 'bold' }} color="primary">
          After paying, please enter the exact amount you added below.
        </Typography>
        <TextField
            autoFocus
            margin="dense"
            id="amount"
            label="Amount Added ($)"
            type="number"
            fullWidth
            variant="standard"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ step: "0.01" }}
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAddBalance} variant="contained">Update My Balance</Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddBalanceModal;


