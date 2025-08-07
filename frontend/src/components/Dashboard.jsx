import React from 'react';
import { Typography, Box, Button } from '@mui/material';

function Dashboard({ user, onLogout }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" gutterBottom>
          {/* --- FIX --- */}
          {/* Ensure you are using camelCase 'displayName' here */}
          Welcome, {user.displayName}!
        </Typography>
        <Button variant="outlined" color="primary" onClick={onLogout}>
          Logout
        </Button>
      </Box>
      <Typography variant="h6">
        Your current balance is: ${user.balance.toFixed(2)}
      </Typography>
    </Box>
  );
}

export default Dashboard;
