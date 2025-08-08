import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SnackForm from './SnackForm';

function SnackManager({ user }) {
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSnack, setEditingSnack] = useState(null);

  const fetchSnacks = async () => {
    const response = await fetch('http://localhost:5106/api/snacks');
    const data = await response.json();
    setSnacks(data);
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
    if (window.confirm('Are you sure you want to delete this snack?')) {
      await fetch(`http://localhost:5106/api/admin/snacks/${snackId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': user.UserId },
      });
      fetchSnacks();
    }
  };

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
              <TableRow key={snack.snackId}>
                <TableCell>{snack.name}</TableCell>
                <TableCell align="right">${typeof snack.price === 'number' ? snack.price.toFixed(2) : Number(snack.price || 0).toFixed(2)}</TableCell>
                <TableCell align="right">{snack.stock}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpenForm(snack)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(snack.snackId)}><DeleteIcon /></IconButton>
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

