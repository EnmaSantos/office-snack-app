import React from 'react';
import { Typography, Box, Paper, Button } from '@mui/material';
import SnackManager from './SnackManager';

// This is the main container for the admin section.
// It receives 'setView' to allow navigation back to the dashboard.
function AdminPage({ user, setView }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Admin Panel
        </Typography>
        <Button variant="outlined" onClick={() => setView('dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Snack Management
        </Typography>
        <SnackManager user={user} />
      </Paper>
    </Box>
  );
}

export default AdminPage;

