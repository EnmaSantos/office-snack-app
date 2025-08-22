import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Alert } from '@mui/material';

function SnackRequestForm({ user }) {
  const [snackName, setSnackName] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', severity: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!snackName.trim()) {
      setFeedback({ message: 'Please enter a snack name.', severity: 'warning' });
      return;
    }

    setLoading(true);
    setFeedback({ message: '', severity: '' });

    try {
      const response = await fetch('http://localhost:5106/api/snackrequests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // <-- Add this line
        body: JSON.stringify({ SnackName: snackName }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request.');
      }

      setFeedback({ message: 'Snack request submitted successfully!', severity: 'success' });
      setSnackName('');
    } catch (error) {
      setFeedback({ message: error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom>
        Request a New Snack
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Can't find what you're looking for? Let us know what you'd like to see!
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        label="Snack Name"
        value={snackName}
        onChange={(e) => setSnackName(e.target.value)}
        sx={{ mb: 2 }}
        disabled={loading}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        fullWidth
      >
        {loading ? <CircularProgress size={24} /> : 'Submit Request'}
      </Button>
      {feedback.message && (
        <Alert severity={feedback.severity} sx={{ mt: 2 }}>
          {feedback.message}
        </Alert>
      )}
    </Box>
  );
}

export default SnackRequestForm;
