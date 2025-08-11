import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, CircularProgress, Alert, Divider, IconButton, Badge } from '@mui/material';
import AdminPage from './AdminPage';
import SnackList from './SnackList';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Cart from './Cart';

// It now receives the 'updateUser' function from App.jsx, plus cart props
function Dashboard({ user, onLogout, updateUser, cart, setCart }) {
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // --- NEW STATE FOR PURCHASE FEEDBACK ---
  const [purchaseStatus, setPurchaseStatus] = useState({ message: '', severity: 'success' });
  const [view, setView] = useState('dashboard');
  // --- CART VISIBILITY ---
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const fetchSnacks = async () => {
      try {
        const response = await fetch('http://localhost:5106/api/snacks');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        // Normalize to PascalCase for consistency with UI components
        const normalized = (Array.isArray(data) ? data : []).map((s) => ({
          SnackId: s.SnackId ?? s.snackId,
          Name: s.Name ?? s.name,
          Price: s.Price ?? s.price,
          Stock: s.Stock ?? s.stock,
          ImageUrl: s.ImageUrl ?? s.imageUrl,
          IsAvailable: s.IsAvailable ?? s.isAvailable,
        }));
        setSnacks(normalized);
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

  if (view === 'admin' && user?.IsAdmin) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5">Welcome, {user.DisplayName}!</Typography>
            <Typography variant="h6">Your current balance is: ${formattedBalance}</Typography>
          </Box>
          <Box>
            <Button variant="outlined" color="primary" onClick={() => setView('dashboard')} sx={{ mr: 1 }}>
              Back to Dashboard
            </Button>
            <Button variant="outlined" color="primary" onClick={onLogout}>
              Logout
            </Button>
          </Box>
        </Box>
        <AdminPage user={user} setView={setView} />
      </Box>
    );
  }

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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {user?.IsAdmin && (
            <Button variant="contained" color="secondary" onClick={() => setView('admin')} sx={{ mr: 1 }}>
              Open Admin Panel
            </Button>
          )}
          <IconButton color="primary" onClick={() => setIsCartOpen(true)} sx={{ mr: 2 }}>
            <Badge badgeContent={cart?.length || 0} color="error">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
          <Button variant="outlined" color="primary" onClick={onLogout}>
            Logout
          </Button>
        </Box>
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
        <SnackList snacks={snacks} cart={cart} setCart={setCart} />
      )}
      <Cart 
        cart={cart || []}
        setCart={setCart}
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        user={user}
        updateUser={updateUser}
      />
    </Box>
  );
}

export default Dashboard;