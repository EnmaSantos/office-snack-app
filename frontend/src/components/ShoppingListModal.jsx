import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  TextField,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

function ShoppingListModal({ open, onClose, user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [allItems, setAllItems] = useState([]);
  const [snackRequests, setSnackRequests] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [manualItems, setManualItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemNotes, setNewItemNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchAllItems();
      fetchSnackRequests();
    }
  }, [open, user.UserId]);

  const fetchAllItems = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('http://localhost:5106/api/snacks', {
        headers: {
          'X-User-Id': user.UserId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

      const data = await response.json();
      // Sort items by stock level (lowest to highest)
      const sortedItems = data
        .filter(item => item.isAvailable) // Only show available items
        .sort((a, b) => a.stock - b.stock)
        .map(item => ({
          snackId: item.snackId,
          name: item.name,
          stock: item.stock,
          price: item.price,
          imageUrl: item.imageUrl,
          suggestedQuantity: Math.max(1, 10 - item.stock) // Suggest quantity to reach 10 stock
        }));
      
      setAllItems(sortedItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSnackRequests = async () => {
    try {
      const response = await fetch('http://localhost:5106/api/snackrequests', {
        headers: {
          'X-User-Id': user.UserId,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch snack requests');
      }
      const data = await response.json();
      setSnackRequests(data.filter(req => req.status === 'Pending'));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleItemToggle = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(selected => selected.snackId === item.snackId);
      if (exists) {
        return prev.filter(selected => selected.snackId !== item.snackId);
      } else {
        return [...prev, {
          name: item.name,
          quantity: item.suggestedQuantity,
          isExistingSnack: true,
          snackId: item.snackId,
          notes: `Current stock: ${item.stock}`
        }];
      }
    });
  };

  const handleQuantityChange = (snackId, quantity) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.snackId === snackId
          ? { ...item, quantity: Math.max(1, parseInt(quantity) || 1) }
          : item
      )
    );
  };

  const addManualItem = () => {
    if (!newItemName.trim()) return;

    const newItem = {
      name: newItemName.trim(),
      quantity: Math.max(1, newItemQuantity),
      isExistingSnack: false,
      snackId: null,
      notes: newItemNotes.trim() || undefined
    };

    setManualItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemNotes('');
  };

  const removeManualItem = (index) => {
    setManualItems(prev => prev.filter((_, i) => i !== index));
  };

  const generateShoppingList = async () => {
    const allItems = [...selectedItems, ...manualItems];
    
    if (allItems.length === 0) {
      setError('Please select at least one item for the shopping list');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const response = await fetch('http://localhost:5106/api/Admin/generate-shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.UserId,
        },
        body: JSON.stringify({ items: allItems }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate shopping list');
      }

      // Download the PDF file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Shopping_List_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close modal after successful generation
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedItems([]);
    setManualItems([]);
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemNotes('');
    setError('');
    setCurrentTab(0);
    onClose();
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const totalItems = selectedItems.length + manualItems.length;
  const totalQuantity = [...selectedItems, ...manualItems].reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartIcon />
          Generate Shopping List
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label={`All Items${allItems.length > 0 ? ` (${allItems.length})` : ''}`} />
          <Tab label={`Pending Requests${snackRequests.length > 0 ? ` (${snackRequests.length})` : ''}`} />
          <Tab label={`Manual Items${manualItems.length > 0 ? ` (${manualItems.length})` : ''}`} />
          <Tab label={`Review${totalItems > 0 ? ` (${totalItems})` : ''}`} />
        </Tabs>

        {/* All Items Tab */}
        {currentTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCartIcon color="primary" />
              All Items (Sorted by Stock Level)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              All available items sorted from lowest to highest stock. Items with lower stock appear first to help prioritize restocking.
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : allItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No items found.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {allItems.map((item) => {
                  const isSelected = selectedItems.some(selected => selected.snackId === item.snackId);
                  const selectedItem = selectedItems.find(selected => selected.snackId === item.snackId);
                  
                  return (
                    <Grid item xs={12} sm={6} key={item.snackId}>
                      <Card variant={isSelected ? "outlined" : "elevation"} 
                            sx={{ 
                              bgcolor: isSelected ? 'action.selected' : 'background.paper',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleItemToggle(item)}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleItemToggle(item)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {item.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Current stock: {item.stock}
                              </Typography>
                              <Typography variant="body2" color="warning.main">
                                Suggested quantity: {item.suggestedQuantity}
                              </Typography>
                              {isSelected && (
                                <TextField
                                  size="small"
                                  type="number"
                                  label="Quantity"
                                  value={selectedItem.quantity}
                                  onChange={(e) => handleQuantityChange(item.snackId, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  sx={{ mt: 1, width: 100 }}
                                  inputProps={{ min: 1 }}
                                />
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* Snack Requests Tab */}
        {currentTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Pending Snack Requests
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add snacks requested by users to the shopping list.
            </Typography>
            {snackRequests.length === 0 ? (
              <Typography>No pending requests.</Typography>
            ) : (
              <List>
                {snackRequests.map(request => (
                  <ListItem key={request.id}>
                    <ListItemText
                      primary={request.snackName}
                      secondary={`Requested by ${request.requestedByUser?.displayName}`}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setNewItemName(request.snackName);
                        setCurrentTab(2); // Switch to Manual Items tab
                      }}
                    >
                      Add to List
                    </Button>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Manual Items Tab */}
        {currentTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Add Manual Items
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add items that are not currently in the store or that you want to purchase additionally.
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="end">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Item Name"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addManualItem();
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantity"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Notes (optional)"
                      value={newItemNotes}
                      onChange={(e) => setNewItemNotes(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={addManualItem}
                      disabled={!newItemName.trim()}
                      startIcon={<AddIcon />}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {manualItems.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Manual Items ({manualItems.length})
                  </Typography>
                  <List>
                    {manualItems.map((item, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText
                            primary={item.name}
                            secondary={
                              <span>
                                <span style={{ display: 'block' }}>
                                  Quantity: {item.quantity}
                                </span>
                                {item.notes && (
                                  <span style={{ display: 'block', color: 'rgba(0, 0, 0, 0.6)' }}>
                                    Notes: {item.notes}
                                  </span>
                                )}
                              </span>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => removeManualItem(index)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < manualItems.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {/* Review Tab */}
        {currentTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Shopping List
            </Typography>
            
            {totalItems === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No items selected. Please go back to the previous tabs to add items.
              </Typography>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <Chip label={`${totalItems} items`} sx={{ mr: 1 }} />
                  <Chip label={`${totalQuantity} total quantity`} />
                </Box>

                <Card>
                  <CardContent>
                    <List>
                      {[...selectedItems, ...manualItems].map((item, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {item.name}
                                  {item.isExistingSnack && (
                                    <Chip size="small" label="Store Item" color="primary" />
                                  )}
                                </span>
                              }
                              secondary={
                                <span>
                                  <span style={{ display: 'block' }}>
                                    Quantity: {item.quantity}
                                  </span>
                                  {item.notes && (
                                    <span style={{ display: 'block', color: 'rgba(0, 0, 0, 0.6)' }}>
                                      Notes: {item.notes}
                                    </span>
                                  )}
                                </span>
                              }
                            />
                          </ListItem>
                          {index < totalItems - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={generateShoppingList}
          disabled={totalItems === 0 || generating}
          startIcon={generating ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
        >
          {generating ? 'Generating PDF...' : 'Generate PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ShoppingListModal;
