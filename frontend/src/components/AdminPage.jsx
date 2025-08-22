import React, { useState } from 'react';
import { Typography, Box, Paper, Button, Tabs, Tab } from '@mui/material';
import { ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import SnackManager from './SnackManager';
import UserBalanceManager from './UserBalanceManager';
import TransactionViewer from './TransactionViewer';
import ShoppingListModal from './ShoppingListModal';
import SnackRequestManager from './SnackRequestManager';

// This is the main container for the admin section.
// It receives 'setView' to allow navigation back to the dashboard.
function AdminPage({ user, setView }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Admin Panel
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<ShoppingCartIcon />}
            onClick={() => setShoppingListOpen(true)}
            color="secondary"
          >
            Generate Shopping List
          </Button>
          <Button variant="outlined" onClick={() => setView('dashboard')}>
            Back to Dashboard
          </Button>
        </Box>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Snack Management" />
          <Tab label="Snack Requests" />
          <Tab label="Users" />
          <Tab label="All Transactions" />
        </Tabs>

        {currentTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Snack Management
            </Typography>
            <SnackManager user={user} />
          </Box>
        )}

        {currentTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Snack Requests
            </Typography>
            <SnackRequestManager user={user} />
          </Box>
        )}

        {currentTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              User Management
            </Typography>
            <UserBalanceManager user={user} />
          </Box>
        )}

        {currentTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Transaction History
            </Typography>
            <TransactionViewer user={user} />
          </Box>
        )}
      </Paper>

      <ShoppingListModal
        open={shoppingListOpen}
        onClose={() => setShoppingListOpen(false)}
        user={user}
      />
    </Box>
  );
}

export default AdminPage;

