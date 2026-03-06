import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Avatar,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { LineChart } from '@mui/x-charts/LineChart';
import { API_BASE_URL } from '../config';

export default function UserDetailView({ selectedUser, adminUser, onBack }) {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedUser?.UserId) {
      fetchUserStats();
      fetchUserTransactions();
    }
  }, [selectedUser?.UserId]);

  const fetchUserStats = async () => {
    setLoadingStats(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/Admin/user-stats/${selectedUser.UserId}`, {
        headers: { 'X-User-Id': adminUser.UserId },
      });
      if (!response.ok) throw new Error('Failed to fetch user stats.');
      const data = await response.json();
      setStats({
        MostBoughtItems: data.MostBoughtItems ?? data.mostBoughtItems ?? [],
        DailySpending: data.DailySpending ?? data.dailySpending ?? [],
        TotalSpent: data.TotalSpent ?? data.totalSpent ?? 0,
        TotalPurchases: data.TotalPurchases ?? data.totalPurchases ?? 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUserTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Admin/user-transactions/${selectedUser.UserId}`, {
        headers: { 'X-User-Id': adminUser.UserId },
      });
      if (!response.ok) throw new Error('Failed to fetch transactions.');
      const data = await response.json();
      const normalized = data.map(t => ({
        TransactionId: t.TransactionId || t.transactionId,
        TransactionAmount: t.TransactionAmount ?? t.transactionAmount,
        Timestamp: t.Timestamp || t.timestamp,
        SnackName: t.SnackName || t.snackName,
        SnackPrice: t.SnackPrice ?? t.snackPrice,
        SnackImageUrl: t.SnackImageUrl || t.snackImageUrl,
      }));
      setTransactions(normalized);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleString();

  // Prepare chart data
  const chartDates = stats?.DailySpending?.map(d => new Date(d.Date)) ?? [];
  const chartAmounts = stats?.DailySpending?.map(d => Number(d.Amount ?? d.amount)) ?? [];

  return (
    <Box>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ mb: 2 }}
        variant="text"
      >
        Back to User List
      </Button>

      {/* User Header Card */}
      <Card elevation={3} sx={{ mb: 3, background: 'linear-gradient(135deg, #006EB6 0%, #004d80 100%)', color: 'white' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={selectedUser.ProfilePictureUrl}
              alt={selectedUser.DisplayName}
              sx={{ width: 72, height: 72, border: '3px solid rgba(255,255,255,0.4)' }}
            >
              {!selectedUser.ProfilePictureUrl && (selectedUser.IsAdmin ? <AdminPanelSettingsIcon fontSize="large" /> : <PersonIcon fontSize="large" />)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight="bold">
                {selectedUser.DisplayName || 'No Name'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.85 }}>
                {selectedUser.Email}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip
                  label={selectedUser.IsAdmin ? 'Administrator' : 'User'}
                  sx={{
                    bgcolor: selectedUser.IsAdmin ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                  size="small"
                />
                <Chip
                  label={`Balance: ${formatCurrency(selectedUser.Balance)}`}
                  sx={{
                    bgcolor: selectedUser.Balance < 0 ? 'rgba(244,67,54,0.4)' : 'rgba(76,175,80,0.35)',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                  size="small"
                />
              </Box>
            </Box>

            {/* Summary Stats */}
            {!loadingStats && stats && (
              <Box sx={{ display: 'flex', gap: 3, textAlign: 'center' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.TotalPurchases}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Purchases
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(stats.TotalSpent)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Total Spent
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>Error: {error}</Typography>
      )}

      {loadingStats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Most Bought Items */}
          <Grid item xs={12} md={5}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingBagIcon sx={{ mr: 1, color: 'primary.main' }} /> Most Bought Items
              </Typography>
              {stats.MostBoughtItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No purchase data yet.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {stats.MostBoughtItems.map((item, index) => (
                    <React.Fragment key={item.SnackId || index}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          {item.ImageUrl ? (
                            <Avatar src={item.ImageUrl} alt={item.Name} variant="rounded" />
                          ) : (
                            <Avatar variant="rounded" sx={{ bgcolor: 'primary.light' }}>
                              <ShoppingBagIcon />
                            </Avatar>
                          )}
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body1" fontWeight="medium">
                                {item.Name}
                              </Typography>
                              <Chip
                                label={`×${item.PurchaseCount}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={`Total spent: ${formatCurrency(item.TotalSpent)}`}
                        />
                      </ListItem>
                      {index < stats.MostBoughtItems.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Spending Over Time Chart */}
          <Grid item xs={12} md={7}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingDownIcon sx={{ mr: 1, color: 'secondary.main' }} /> Spending (Last 30 Days)
              </Typography>
              {chartDates.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No spending data in the last 30 days.
                </Typography>
              ) : (
                <Box sx={{ width: '100%', height: 300 }}>
                  <LineChart
                    xAxis={[{
                      data: chartDates,
                      scaleType: 'time',
                      valueFormatter: (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    }]}
                    yAxis={[{
                      valueFormatter: (v) => `$${v.toFixed(2)}`,
                    }]}
                    series={[{
                      data: chartAmounts,
                      label: 'Daily Spending',
                      area: true,
                      color: '#006EB6',
                      showMark: true,
                    }]}
                    height={280}
                    margin={{ left: 60, right: 20, top: 30, bottom: 40 }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Full Transaction History */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <ReceiptIcon sx={{ mr: 1, color: 'text.secondary' }} /> Transaction History
        </Typography>
        {loadingTransactions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : transactions.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No transactions found.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Item</strong></TableCell>
                  <TableCell align="right"><strong>Amount</strong></TableCell>
                  <TableCell align="right"><strong>Item Price</strong></TableCell>
                  <TableCell align="center"><strong>Date & Time</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.TransactionId} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {t.SnackImageUrl && (
                          <Box
                            component="img"
                            src={t.SnackImageUrl}
                            alt={t.SnackName}
                            sx={{ width: 28, height: 28, borderRadius: 1, mr: 1, objectFit: 'cover' }}
                          />
                        )}
                        {t.SnackName || (Number(t.TransactionAmount) > 0 ? 'Deposit' : 'Balance Adjustment')}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {Number(t.TransactionAmount) < 0 ? (
                        <Typography variant="body2" color="error" fontWeight="bold">
                          -{formatCurrency(Math.abs(t.TransactionAmount))}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          +{formatCurrency(Math.abs(t.TransactionAmount))}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {t.SnackPrice != null ? formatCurrency(t.SnackPrice) : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(t.Timestamp)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
