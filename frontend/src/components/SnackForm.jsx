import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Switch, FormControlLabel } from '@mui/material';

// This component is a pop-up form for creating and editing snacks.
function SnackForm({ open, onClose, snack, user, refreshSnacks }) {
  const [formData, setFormData] = useState({
    Name: '',
    Price: 0,
    Stock: 0,
    ImageUrl: '',
    IsAvailable: true,
  });

  useEffect(() => {
    if (snack) {
      setFormData({
        Name: snack.Name ?? '',
        Price: snack.Price ?? 0,
        Stock: snack.Stock ?? 0,
        ImageUrl: snack.ImageUrl ?? '',
        IsAvailable: snack.IsAvailable ?? true,
        SnackId: snack.SnackId,
      });
    } else {
      // Reset to default values for a new snack
      setFormData({ Name: '', Price: 0, Stock: 0, ImageUrl: '', IsAvailable: true });
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
    const isEditing = Boolean(snack && snack.SnackId);
    const url = isEditing 
      ? `http://localhost:5106/api/Admin/snacks/${snack.SnackId}` 
      : 'http://localhost:5106/api/Admin/snacks';
    const method = isEditing ? 'PUT' : 'POST';

    const body = {
      SnackId: isEditing ? snack.SnackId : undefined,
      Name: formData.Name,
      Price: parseFloat(formData.Price),
      Stock: parseInt(String(formData.Stock), 10),
      ImageUrl: formData.ImageUrl || null,
      IsAvailable: Boolean(formData.IsAvailable),
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
          <TextField autoFocus margin="dense" name="Name" label="Snack Name" type="text" fullWidth variant="standard" value={formData.Name} onChange={handleChange} required />
          <TextField margin="dense" name="Price" label="Price" type="number" fullWidth variant="standard" value={formData.Price} onChange={handleChange} required inputProps={{ step: '0.01' }} />
          <TextField margin="dense" name="Stock" label="Stock" type="number" fullWidth variant="standard" value={formData.Stock} onChange={handleChange} required />
          <TextField margin="dense" name="ImageUrl" label="Image URL" type="text" fullWidth variant="standard" value={formData.ImageUrl} onChange={handleChange} />
          <FormControlLabel control={<Switch checked={formData.IsAvailable} onChange={handleChange} name="IsAvailable" />} label="Is Available" />
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

