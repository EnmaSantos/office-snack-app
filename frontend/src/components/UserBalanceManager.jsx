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
  Divider,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert
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
  const [toggleLoading, setToggleLoading] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Fetch all user balances
  const fetchUserBalances = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5106/api/Admin/user-balances', {
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
          IsAdmin: userData.IsAdmin || userData.isAdmin,
          ProfilePictureUrl: userData.ProfilePictureUrl || userData.profilePictureUrl
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
      const response = await fetch(`http://localhost:5106/api/Admin/user-transactions/${userId}`, {
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

  const handleToggleAdminStatus = async (userId, currentAdminStatus) => {
    // Prevent user from toggling their own admin status
    if (userId === user.UserId) {
      setSnackbarMessage('You cannot change your own admin status.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setToggleLoading(userId);
    try {
      const response = await fetch('http://localhost:5106/api/Admin/toggle-admin-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.UserId,
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the users state to reflect the change
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.UserId === userId 
              ? { ...u, IsAdmin: data.isAdmin }
              : u
          )
        );
        setSnackbarMessage(data.message);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        const errorData = await response.json();
        setSnackbarMessage(errorData.message || 'Failed to update admin status');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      setSnackbarMessage('Error updating admin status');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
    setToggleLoading(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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
                    <Avatar 
                      src={userData.ProfilePictureUrl} 
                      alt={userData.DisplayName} 
                      sx={{ mr: 2 }}
                    >
                      {!userData.ProfilePictureUrl && (userData.IsAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />)}
                    </Avatar>
                    {userData.DisplayName || 'No Name'}
                  </Box>
                </TableCell>
                <TableCell>{userData.Email}</TableCell>
                <TableCell align="center">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={userData.IsAdmin}
                        onChange={() => handleToggleAdminStatus(userData.UserId, userData.IsAdmin)}
                        disabled={toggleLoading === userData.UserId || userData.UserId === user.UserId}
                        color="primary"
                        size="small"
                      />
                    }
                    label={userData.IsAdmin ? 'Admin' : 'User'}
                    labelPlacement="start"
                    sx={{ 
                      m: 0,
                      opacity: userData.UserId === user.UserId ? 0.6 : 1,
                      '& .MuiFormControlLabel-label': { 
                        fontSize: '0.875rem',
                        fontWeight: userData.IsAdmin ? 'bold' : 'normal',
                        color: userData.IsAdmin ? 'primary.main' : 'text.secondary'
                      }
                    }}
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
              <Avatar 
                src={selectedUser.ProfilePictureUrl} 
                alt={selectedUser.DisplayName} 
                sx={{ mr: 2 }}
              >
                {!selectedUser.ProfilePictureUrl && (selectedUser.IsAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />)}
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
                            {transaction.SnackName || 'Balance Added'}
                          </Typography>
                          {Number(transaction.TransactionAmount) < 0 ? (
                            <Typography
                              variant="body1"
                              component="span"
                              color="error"
                              fontWeight="bold"
                            >
                              -{formatCurrency(Math.abs(transaction.TransactionAmount))}
                            </Typography>
                          ) : (
                            <Typography
                              variant="body1"
                              component="span"
                              color="success.main"
                              fontWeight="bold"
                            >
                              +{formatCurrency(Math.abs(transaction.TransactionAmount))}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(transaction.Timestamp)}
                          </Typography>
                          {transaction.SnackPrice != null && (
                            <Typography variant="body2" color="text.secondary">
                              Snack Price: {formatCurrency(transaction.SnackPrice)}
                            </Typography>
                          )}
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default UserBalanceManager;
