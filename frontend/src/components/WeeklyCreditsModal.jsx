import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, InputLabel, FormControl, CircularProgress, Alert, Typography } from '@mui/material';
import { API_BASE_URL } from '../config';

export default function WeeklyCreditsModal({ open, onClose, user, refreshUsers }) {
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fetchingSheets, setFetchingSheets] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSheetNames();
      setSuccess('');
      setError('');
      setSelectedSheet('');
    }
  }, [open]);

  const fetchSheetNames = async () => {
    setFetchingSheets(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/sheet-names`, {
        headers: {
          'X-User-Id': user?.UserId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch Google Sheet tabs.');

      const names = await response.json();
      // Filter out non-week sheets (assuming week tabs start with 'W' or 'Week')
      const weekSheets = names.filter(n => n.toUpperCase().startsWith('W'));
      setSheetNames(weekSheets);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingSheets(false);
    }
  };

  const handleDistribute = async () => {
    if (!selectedSheet) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/distribute-weekly-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.UserId,
        },
        body: JSON.stringify({ WeekSheetName: selectedSheet }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error distributing credits.');
      }

      setSuccess(`Successfully distributed $${data.totalDistributed} to ${data.usersUpdated} users!`);
      // Tell parent component to refresh the data
      if (refreshUsers) refreshUsers();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Distribute Weekly Credits</DialogTitle>
      <DialogContent sx={{ minHeight: 150 }}>
        <Typography gutterBottom>
          Select a week from the schedule to calculate and distribute credits automatically. 
          ($1 for every 4 hours scheduled).
        </Typography>

        {fetchingSheets ? (
          <CircularProgress size={24} sx={{ display: 'block', margin: '20px auto' }} />
        ) : (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="sheet-select-label">Select Week Tab</InputLabel>
            <Select
              labelId="sheet-select-label"
              value={selectedSheet}
              label="Select Week Tab"
              onChange={(e) => setSelectedSheet(e.target.value)}
              disabled={loading || sheetNames.length === 0}
            >
              {sheetNames.map((name, index) => (
                <MenuItem key={index} value={name}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
        
        {sheetNames.length === 0 && !fetchingSheets && !error && (
            <Alert severity="warning" sx={{ mt: 2 }}>No week tabs found in the Google Sheet.</Alert>
        )}

      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleDistribute} 
          variant="contained" 
          disabled={!selectedSheet || loading || fetchingSheets}
          color="secondary"
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Distribute Credits'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
