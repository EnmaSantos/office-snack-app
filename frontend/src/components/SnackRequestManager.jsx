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
    const requestToUpdate = requests.find(r => r.Id === id);
    if (!requestToUpdate) return;

    const originalStatus = requestToUpdate.Status;
    const updatedRequest = { ...requestToUpdate, Status: newStatus };
    setRequests(requests.map(r => r.Id === id ? updatedRequest : r));

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
      setRequests(requests.map(r => r.Id === id ? { ...r, Status: originalStatus } : r));
    }
  };

  const handleDelete = async (id) => {
    const originalRequests = requests;
    setRequests(requests.filter(r => r.Id !== id));

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
          <ListItem key={request.Id} divider>
            <ListItemText
              primary={request.SnackName}
              secondary={`Requested by ${request.RequestedByUser?.DisplayName || 'Unknown'} · ${formatDistanceToNow(new Date(request.RequestDate), { addSuffix: true })}`}
            />
            <Chip
              label={request.Status}
              color={request.Status === 'Pending' ? 'warning' : 'success'}
              size="small"
              sx={{ mx: 2 }}
            />
            <Tooltip title="Mark as Purchased">
              <span>
                <IconButton
                  onClick={() => handleUpdateStatus(request.Id, 'Purchased')}
                  disabled={request.Status === 'Purchased'}
                  color="success"
                >
                  <CheckCircleOutline />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Mark as Pending">
              <span>
                <IconButton
                  onClick={() => handleUpdateStatus(request.Id, 'Pending')}
                  disabled={request.Status === 'Pending'}
                  color="warning"
                >
                  <HourglassEmpty />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete Request">
              <IconButton onClick={() => handleDelete(request.Id)} color="error">
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
