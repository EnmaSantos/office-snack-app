import React from 'react';
import { Typography, Box, Button } from '@mui/material';

function Dashboard({ user, onLogout }) {
  // --- FIX ---
  // This is a defensive check. It verifies that user.balance is a number.
  // If it is, it formats it. If not, it defaults to "0.00".
  // This prevents the application from crashing if the balance is missing.
  const formattedBalance = typeof user.balance === 'number' 
    ? user.balance.toFixed(2) 
    : '0.00';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Welcome, {user.displayName}!
        </Typography>
        <Button variant="outlined" color="primary" onClick={onLogout}>
          Logout
        </Button>
      </Box>
      <Typography variant="h6">
        Your current balance is: ${formattedBalance}
      </Typography>
    </Box>
  );
}

export default Dashboard;
