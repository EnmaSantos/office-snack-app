import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { API_BASE_URL } from '../config';

function StoreTrends({ user }) {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/api/Admin/store-trends`, {
          headers: { 'X-User-Id': user.UserId }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch store trends.');
        }

        const data = await response.json();
        setTrends(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [user.UserId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error loading trends: {error}</Typography>
      </Box>
    );
  }

  if (!trends) return null;

  const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <TrendingUpIcon sx={{ mr: 1 }} /> Store Analytics
      </Typography>

      {/* Top Level Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StorefrontIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Store Revenue</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {formatCurrency(trends.TotalRevenue || trends.totalRevenue || 0)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Total value of all consumed snacks.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalanceWalletIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Credits Distributed</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {formatCurrency(trends.TotalCreditsDistributed || trends.totalCreditsDistributed || 0)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Total system funds allocated to users.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Tables */}
      <Grid container spacing={4}>
        
        {/* Best Sellers */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom color="primary.main" sx={{ display: 'flex', alignItems: 'center' }}>
              🔥 Top selling items
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell align="right"><strong>Units Sold</strong></TableCell>
                    <TableCell align="right"><strong>Revenue</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(trends.BestSellers || trends.bestSellers || []).map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.Name || item.name}</TableCell>
                      <TableCell align="right">
                        <Chip label={item.UnitsSold || item.unitsSold} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(item.Revenue || item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(trends.BestSellers || trends.bestSellers || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">No sales data available yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Stagnant Inventory */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom color="warning.main" sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningAmberIcon sx={{ mr: 1 }} /> Potential Stagnant Inventory
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Items with stock that haven't sold in the last 30 days.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell align="right"><strong>Current Stock</strong></TableCell>
                    <TableCell align="right"><strong>Last Sold</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(trends.StagnantInventory || trends.stagnantInventory || []).map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.Name || item.name}</TableCell>
                      <TableCell align="right">
                        <Chip label={item.CurrentStock || item.currentStock} size="small" color="warning" />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        {(item.LastSoldDate || item.lastSoldDate) 
                          ? new Date(item.LastSoldDate || item.lastSoldDate).toLocaleDateString() 
                          : 'Never'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                  {(trends.StagnantInventory || trends.stagnantInventory || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">No stagnant inventory! Everything is selling great.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}

export default StoreTrends;
