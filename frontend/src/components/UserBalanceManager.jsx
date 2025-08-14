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
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ReceiptIcon from '@mui/icons-material/Receipt';

function UserBalanceManager({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTransactions, setUserTransactions] = useState([]);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Fetch all user balances
  const fetchUserBalances = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5106/api/admin/user-balances', {
        headers: { 'X-User-Id': user.UserId },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Normalize the response to handle both camelCase and PascalCase
        const normalizedUsers = data.map(userData => ({
          UserId: userData.UserId || userData.userId,
          Email: userData.Email || userData.email,
          DisplayName: userData.DisplayName || userData.displayName,
          Balance: userData.Balance || userData.balance,
          IsAdmin: userData.IsAdmin || userData.isAdmin
        }));
        setUsers(normalizedUsers);
      } else {
        console.error('Failed to fetch user balances');
      }
    } catch (error) {
      console.error('Error fetching user balances:', error);
    }
    setLoading(false);
  };

  // Fetch transactions for a specific user
  const fetchUserTransactions = async (userId) => {
    if (!userId) {
      console.error('UserId is undefined');
      setUserTransactions([]);
      setLoadingTransactions(false);
      return;
    }

    setLoadingTransactions(true);
    try {
      const response = await fetch(`http://localhost:5106/api/admin/user-transactions/${userId}`, {
        headers: { 'X-User-Id': user.UserId },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Normalize the transaction data
        const normalizedTransactions = data.map(transaction => ({
          TransactionId: transaction.TransactionId || transaction.transactionId,
          TransactionAmount: transaction.TransactionAmount || transaction.transactionAmount,
          Timestamp: transaction.Timestamp || transaction.timestamp,
          SnackName: transaction.SnackName || transaction.snackName,
          SnackPrice: transaction.SnackPrice || transaction.snackPrice,
          SnackImageUrl: transaction.SnackImageUrl || transaction.snackImageUrl,
          UserEmail: transaction.UserEmail || transaction.userEmail,
          UserDisplayName: transaction.UserDisplayName || transaction.userDisplayName
        }));
        setUserTransactions(normalizedTransactions);
      } else {
        console.error('Failed to fetch user transactions');
        setUserTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      setUserTransactions([]);
    }
    setLoadingTransactions(false);
  };

  useEffect(() => {
    fetchUserBalances();
  }, []);

  const handleViewTransactions = async (userData) => {
    setSelectedUser(userData);
    setTransactionDialogOpen(true);
    await fetchUserTransactions(userData.UserId);
  };

  const handleCloseTransactionDialog = () => {
    setTransactionDialogOpen(false);
    setSelectedUser(null);
    setUserTransactions([]);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `$${Number(amount).toFixed(2)}`;
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
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="center">Role</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((userData) => (
              <TableRow key={userData.UserId}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ mr: 2, bgcolor: userData.IsAdmin ? 'primary.main' : 'grey.400' }}>
                      {userData.IsAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                    </Avatar>
                    {userData.DisplayName || 'No Name'}
                  </Box>
                </TableCell>
                <TableCell>{userData.Email}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={userData.IsAdmin ? 'Admin' : 'User'}
                    color={userData.IsAdmin ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    color={userData.Balance < 0 ? 'error' : 'inherit'}
                    fontWeight={userData.Balance < 0 ? 'bold' : 'normal'}
                  >
                    {formatCurrency(userData.Balance)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReceiptIcon />}
                    onClick={() => handleViewTransactions(userData)}
                  >
                    View Transactions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Transaction Dialog */}
      <Dialog
        open={transactionDialogOpen}
        onClose={handleCloseTransactionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedUser && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ mr: 2, bgcolor: selectedUser.IsAdmin ? 'primary.main' : 'grey.400' }}>
                {selectedUser.IsAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedUser.DisplayName || 'No Name'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedUser.Email} • Balance: {formatCurrency(selectedUser.Balance)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {loadingTransactions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : userTransactions.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No transactions found for this user.
            </Typography>
          ) : (
            <List>
              {userTransactions.map((transaction, index) => (
                <React.Fragment key={transaction.TransactionId}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" component="span">
                            {transaction.SnackName}
                          </Typography>
                          <Typography
                            variant="body1"
                            component="span"
                            color="error"
                            fontWeight="bold"
                          >
                            -{formatCurrency(transaction.TransactionAmount)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(transaction.Timestamp)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Snack Price: {formatCurrency(transaction.SnackPrice)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < userTransactions.length - 1 && <Divider key={`divider-${transaction.TransactionId}`} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTransactionDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserBalanceManager;
