import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Switch, FormControlLabel } from '@mui/material';

function SnackForm({ open, onClose, snack, user, refreshSnacks }) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    imageUrl: '',
    isAvailable: true,
  });

  useEffect(() => {
    if (snack) {
      // Map existing snack (already camelCase from API usage elsewhere)
      setFormData({
        name: snack.name ?? '',
        price: snack.price ?? 0,
        stock: snack.stock ?? 0,
        imageUrl: snack.imageUrl ?? '',
        isAvailable: snack.isAvailable ?? true,
        snackId: snack.snackId,
      });
    } else {
      setFormData({ name: '', price: 0, stock: 0, imageUrl: '', isAvailable: true });
    }
  }, [snack, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditing = Boolean(snack && snack.snackId);
    const url = isEditing 
      ? `http://localhost:5106/api/admin/snacks/${snack.snackId}` 
      : 'http://localhost:5106/api/admin/snacks';
    const method = isEditing ? 'PUT' : 'POST';

    const body = {
      snackId: isEditing ? snack.snackId : undefined,
      name: formData.name,
      price: parseFloat(formData.price),
      stock: parseInt(String(formData.stock), 10),
      imageUrl: formData.imageUrl || null,
      isAvailable: Boolean(formData.isAvailable),
    };

    await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.UserId,
      },
      body: JSON.stringify(body),
    });

    refreshSnacks();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{snack ? 'Edit Snack' : 'Add New Snack'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField autoFocus margin="dense" name="name" label="Snack Name" type="text" fullWidth variant="standard" value={formData.name} onChange={handleChange} required />
          <TextField margin="dense" name="price" label="Price" type="number" fullWidth variant="standard" value={formData.price} onChange={handleChange} required inputProps={{ step: '0.01' }} />
          <TextField margin="dense" name="stock" label="Stock" type="number" fullWidth variant="standard" value={formData.stock} onChange={handleChange} required />
          <TextField margin="dense" name="imageUrl" label="Image URL" type="text" fullWidth variant="standard" value={formData.imageUrl} onChange={handleChange} />
          <FormControlLabel control={<Switch checked={formData.isAvailable} onChange={handleChange} name="isAvailable" />} label="Is Available" />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit">{snack ? 'Save Changes' : 'Create'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default SnackForm;

