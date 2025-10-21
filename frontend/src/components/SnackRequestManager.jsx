import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Button
} from '@mui/material';
import { CheckCircleOutline, HourglassEmpty, DeleteOutline } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '../config';

function SnackRequestManager({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/snackrequests`, {
        headers: {
          'X-User-Id': user.UserId,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch snack requests.');
      }
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    const requestToUpdate = requests.find(r => r.id === id);
    if (!requestToUpdate) return;

    const originalStatus = requestToUpdate.status;
    const updatedRequest = { ...requestToUpdate, status: newStatus };
    setRequests(requests.map(r => r.id === id ? updatedRequest : r));

    try {
      const response = await fetch(`${API_BASE_URL}/api/snackrequests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.UserId,
        },
        body: JSON.stringify(updatedRequest),
      });
      if (!response.ok) {
        throw new Error('Failed to update status.');
      }
    } catch (err) {
      setError(err.message);
      setRequests(requests.map(r => r.id === id ? { ...r, status: originalStatus } : r));
    }
  };

  const handleDelete = async (id) => {
    const originalRequests = requests;
    setRequests(requests.filter(r => r.id !== id));

    try {
      const response = await fetch(`${API_BASE_URL}/api/snackrequests/${id}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': user.UserId,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete request.');
      }
    } catch (err) {
      setError(err.message);
      setRequests(originalRequests);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <List>
        {requests.map(request => (
          <ListItem key={request.id} divider>
            <ListItemText
              primary={request.snackName}
              secondary={`Requested by ${request.requestedByUser?.displayName || 'Unknown'} · ${formatDistanceToNow(new Date(request.requestDate), { addSuffix: true })}`}
            />
            <Chip
              label={request.status}
              color={request.status === 'Pending' ? 'warning' : 'success'}
              size="small"
              sx={{ mx: 2 }}
            />
            <Tooltip title="Mark as Purchased">
              <span>
                <IconButton
                  onClick={() => handleUpdateStatus(request.id, 'Purchased')}
                  disabled={request.status === 'Purchased'}
                  color="success"
                >
                  <CheckCircleOutline />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Mark as Pending">
              <span>
                <IconButton
                  onClick={() => handleUpdateStatus(request.id, 'Pending')}
                  disabled={request.status === 'Pending'}
                  color="warning"
                >
                  <HourglassEmpty />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete Request">
              <IconButton onClick={() => handleDelete(request.id)} color="error">
                <DeleteOutline />
              </IconButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      {requests.length === 0 && (
        <Typography variant="body2" color="text.secondary" align="center">
          No snack requests yet.
        </Typography>
      )}
    </Box>
  );
}

export default SnackRequestManager;
