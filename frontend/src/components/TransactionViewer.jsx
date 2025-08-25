import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
  Avatar,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SearchIcon from '@mui/icons-material/Search';

function TransactionViewer({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all transactions
  const fetchAllTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5106/api/Admin/all-transactions', {
        headers: { 'X-User-Id': user.UserId },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Normalize the transaction data
        const normalizedTransactions = data.map(transaction => ({
          TransactionId: transaction.TransactionId || transaction.transactionId,
          UserId: transaction.UserId || transaction.userId,
          TransactionAmount: transaction.TransactionAmount || transaction.transactionAmount,
          Timestamp: transaction.Timestamp || transaction.timestamp,
          SnackName: transaction.SnackName || transaction.snackName,
          SnackPrice: transaction.SnackPrice || transaction.snackPrice,
          SnackImageUrl: transaction.SnackImageUrl || transaction.snackImageUrl,
          UserEmail: transaction.UserEmail || transaction.userEmail,
          UserDisplayName: transaction.UserDisplayName || transaction.userDisplayName
        }));
        setTransactions(normalizedTransactions);
        setFilteredTransactions(normalizedTransactions);
      } else {
        console.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  // Filter transactions based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(transaction =>
        transaction.UserDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.UserEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.SnackName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTransactions(filtered);
    }
  }, [searchTerm, transactions]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `$${Number(amount).toFixed(2)}`;
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by user name, email, or snack name..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Summary */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Chip
          label={`Total Transactions: ${filteredTransactions.length}`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`Total Amount: ${formatCurrency(
            filteredTransactions.reduce((sum, t) => sum + Number(t.TransactionAmount), 0)
          )}`}
          color="secondary"
          variant="outlined"
        />
      </Box>

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Item</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Snack Price</TableCell>
              <TableCell align="center">Date & Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                    {searchTerm ? 'No transactions found matching your search.' : 'No transactions found.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.TransactionId}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          mr: 2,
                          bgcolor: 'grey.400',
                          width: 32,
                          height: 32
                        }}
                      >
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {transaction.UserDisplayName || 'No Name'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.UserEmail}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {transaction.SnackImageUrl ? (
                        <Box
                          component="img"
                          src={transaction.SnackImageUrl}
                          alt={transaction.SnackName}
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            mr: 2,
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          color="success"
                          label="Balance Added"
                          icon={<AdminPanelSettingsIcon fontSize="small" />}
                          sx={{ mr: 2 }}
                        />
                      )}
                      <Typography variant="body2">
                        {transaction.SnackName || 'Deposit'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {Number(transaction.TransactionAmount) < 0 ? (
                      <Typography variant="body2" color="error" fontWeight="bold">
                        -{formatCurrency(Math.abs(transaction.TransactionAmount))}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        +{formatCurrency(Math.abs(transaction.TransactionAmount))}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {transaction.SnackPrice != null ? formatCurrency(transaction.SnackPrice) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(transaction.Timestamp)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default TransactionViewer;
