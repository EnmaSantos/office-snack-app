import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, CircularProgress, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SnackForm from './SnackForm';

function SnackManager({ user }) {
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSnack, setEditingSnack] = useState(null);

  // Function to fetch all snacks (we can reuse this to refresh the list)
  const fetchSnacks = async () => {
    setLoading(true);
    const response = await fetch('http://localhost:5106/api/snacks');
    const data = await response.json();
    // Normalize API response (backend serializes to camelCase by default)
    const normalized = (Array.isArray(data) ? data : []).map((s) => ({
      SnackId: s.SnackId ?? s.snackId,
      Name: s.Name ?? s.name,
      Price: s.Price ?? s.price,
      Stock: s.Stock ?? s.stock,
      ImageUrl: s.ImageUrl ?? s.imageUrl,
      IsAvailable: s.IsAvailable ?? s.isAvailable,
    }));
    setSnacks(normalized);
    setLoading(false);
  };

  useEffect(() => {
    fetchSnacks();
  }, []);

  const handleOpenForm = (snack = null) => {
    setEditingSnack(snack);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingSnack(null);
  };

  const handleDelete = async (snackId) => {
    // Use a confirmation dialog before deleting
    if (window.confirm('Are you sure you want to delete this snack? This action cannot be undone.')) {
      await fetch(`http://localhost:5106/api/admin/snacks/${snackId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': user.UserId },
      });
      fetchSnacks();
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Button variant="contained" onClick={() => handleOpenForm()} sx={{ mb: 2 }}>
        Add New Snack
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {snacks.map((snack) => (
              <TableRow key={snack.SnackId ?? snack.snackId}>
                <TableCell>{snack.Name}</TableCell>
                <TableCell align="right">${snack.Price?.toFixed ? snack.Price.toFixed(2) : Number(snack.Price || 0).toFixed(2)}</TableCell>
                <TableCell align="right">{snack.Stock}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpenForm(snack)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(snack.SnackId ?? snack.snackId)}><DeleteIcon color="error" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <SnackForm
        open={formOpen}
        onClose={handleCloseForm}
        snack={editingSnack}
        user={user}
        refreshSnacks={fetchSnacks}
      />
    </Box>
  );
}

export default SnackManager;

