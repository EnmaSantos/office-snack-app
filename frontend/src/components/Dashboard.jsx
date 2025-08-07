import React from 'react';
import { Typography, Box } from '@mui/material';

// This component will receive the user's data as a prop.
function Dashboard({ user }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Welcome, {user.displayName}!
      </Typography>
      <Typography variant="h6">
        Your current balance is: ${user.balance.toFixed(2)}
      </Typography>
      {/* We will add the list of snacks here later */}
    </Box>
  );
}

export default Dashboard;