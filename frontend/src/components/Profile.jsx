import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Grid,
  Divider,
  CardMedia
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '../config';

function Profile({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/transactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data || []);
    } catch (error) {
      setError('Failed to load transaction history.');
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const totalSpent = transactions.reduce((sum, transaction) => {
    const amount = transaction.TransactionAmount || transaction.transactionAmount;
    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);

  const totalAdded = transactions.reduce((sum, transaction) => {
    const amount = transaction.TransactionAmount || transaction.transactionAmount;
    return amount > 0 ? sum + amount : sum;
  }, 0);

  const purchaseTransactions = transactions.filter(t => {
    const amount = t.TransactionAmount || t.transactionAmount;
    return amount < 0;
  });

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Profile Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #006EB6 0%, #0288D1 100%)', color: 'white' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                mr: 3,
                bgcolor: 'white',
                color: '#006EB6',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}
              src={user.ProfilePictureUrl || ''}
            >
              {!user.ProfilePictureUrl && (user.DisplayName?.charAt(0)?.toUpperCase() || 'U')}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {user.DisplayName || 'Unknown User'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {user.Email}
              </Typography>
              {user.IsAdmin && (
                <Chip
                  label="Admin"
                  sx={{
                    mt: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              )}
            </Box>
          </Box>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: (user.Balance || 0) < 0 ? '#ffcdd2' : 'white'
                  }}
                >
                  ${user.Balance?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {(user.Balance || 0) < 0 ? 'Amount Owed' : 'Current Balance'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  ${totalSpent.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Spent
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {purchaseTransactions.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Purchases Made
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
            Transaction History
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && transactions.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No transactions yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your purchase history will appear here once you start buying snacks!
              </Typography>
            </Box>
          )}

          {!loading && !error && transactions.length > 0 && (
            <Box>
              {transactions.map((transaction, index) => (
                <Box key={transaction.transactionId}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 2,
                      px: 1
                    }}
                  >
                    {/* Snack Image (for purchases) */}
                    {transaction.snackImageUrl && (
                      <CardMedia
                        component="img"
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 1,
                          objectFit: 'cover',
                          mr: 2
                        }}
                        image={transaction.snackImageUrl}
                        alt={transaction.snackName}
                      />
                    )}
                    
                    {/* Transaction Icon for balance additions */}
                    {!transaction.snackImageUrl && (
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          mr: 2,
                          bgcolor: '#4caf50',
                          color: 'white'
                        }}
                      >
                        +
                      </Avatar>
                    )}

                    {/* Transaction Details */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {transaction.snackName || 'Balance Added'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(transaction.timestamp)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getTimeAgo(transaction.timestamp)}
                      </Typography>
                    </Box>

                    {/* Amount */}
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 'bold',
                          color: (transaction.TransactionAmount || transaction.transactionAmount) < 0 ? '#f44336' : '#4caf50'
                        }}
                      >
                        {(transaction.TransactionAmount || transaction.transactionAmount) < 0 ? '-' : '+'}$
                        {Math.abs(transaction.TransactionAmount || transaction.transactionAmount).toFixed(2)}
                      </Typography>
                      {transaction.snackPrice && (
                        <Typography variant="caption" color="text.secondary">
                          ${transaction.snackPrice.toFixed(2)} each
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  {index < transactions.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Profile;
