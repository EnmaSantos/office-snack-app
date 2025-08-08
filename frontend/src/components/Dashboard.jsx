import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, CircularProgress, Alert } from '@mui/material';
import SnackList from './SnackList';

// It now receives the 'updateUser' function from App.jsx
function Dashboard({ user, onLogout, updateUser }) {
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // --- NEW STATE FOR PURCHASE FEEDBACK ---
  const [purchaseStatus, setPurchaseStatus] = useState({ message: '', severity: 'success' });

  useEffect(() => {
    const fetchSnacks = async () => {
      try {
        const response = await fetch('http://localhost:5106/api/snacks');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setSnacks(data);
      } catch (error) {
        setError('Failed to fetch snacks.');
      } finally {
        setLoading(false);
      }
    };
    fetchSnacks();
  }, []);

  const formattedBalance = typeof user.Balance === 'number' 
    ? user.Balance.toFixed(2) 
    : '0.00';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5">
            Welcome, {user.DisplayName}!
          </Typography>
          <Typography variant="h6">
            Your current balance is: ${formattedBalance}
          </Typography>
        </Box>
        <Button variant="outlined" color="primary" onClick={onLogout}>
          Logout
        </Button>
      </Box>

      {/* --- NEW FEEDBACK ALERT --- */}
      {purchaseStatus.message && (
        <Alert severity={purchaseStatus.severity} sx={{ mb: 2 }}>
          {purchaseStatus.message}
        </Alert>
      )}
      
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && !error && (
        <SnackList 
          snacks={snacks} 
          setSnacks={setSnacks}
          user={user} 
          updateUser={updateUser}
          setPurchaseStatus={setPurchaseStatus}
        />
      )}
    </Box>
  );
}

export default Dashboard;