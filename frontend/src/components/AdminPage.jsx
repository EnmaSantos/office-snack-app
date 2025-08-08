import React from 'react';
import { Typography, Box, Paper } from '@mui/material';
import SnackManager from './SnackManager';

function AdminPage({ user }) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>
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

