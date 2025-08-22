import React, { useEffect, useRef, useState } from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, IconButton, TextField, InputAdornment } from '@mui/material';
import { Add, Remove, Clear } from '@mui/icons-material';

function SnackList({ snacks, cart, setCart }) {
  const animationRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isCancelled = false;
    
    // Start cards as invisible for animation
    const cards = document.querySelectorAll('.snack-card');
    cards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(50px)';
    });

    const runAnimation = async () => {
      try {
        const mod = await import('animejs');
        const anime = mod.default || mod;
        if (isCancelled) return;
        
        animationRef.current = anime({
          targets: '.snack-card',
          translateY: [50, 0],
          opacity: [0, 1],
          delay: anime.stagger ? anime.stagger(100) : (_, i) => i * 100,
          easing: 'easeOutExpo',
          duration: 1000,
          complete: () => setIsAnimating(false)
        });
      } catch (_) {
        // Fallback animation without anime.js
        cards.forEach((card, i) => {
          setTimeout(() => {
            if (!isCancelled) {
              card.style.transition = 'all 1s ease-out';
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }
          }, i * 100);
        });
        setTimeout(() => setIsAnimating(false), 1000 + cards.length * 100);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(runAnimation, 50);
    
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [snacks]);
  
  const handleAddToCart = (snackToAdd) => {
    // Count how many of this snack are already in the cart
    const countInCart = cart.filter(item => item.SnackId === snackToAdd.SnackId).length;
    
    // Only add if there's still stock available
    if (countInCart < snackToAdd.Stock) {
      setCart(prevCart => [...prevCart, snackToAdd]);
    }
  };

  const handleRemoveFromCart = (snackToRemove) => {
    const firstIndex = cart.findIndex(item => item.SnackId === snackToRemove.SnackId);
    if (firstIndex !== -1) {
      const newCart = [...cart];
      newCart.splice(firstIndex, 1);
      setCart(newCart);
    }
  };

  const filteredSnacks = snacks.filter(snack =>
    snack.Name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Available Snacks</Typography>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search snacks..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setSearchTerm('')}
                edge="end"
                style={{ visibility: searchTerm ? 'visible' : 'hidden' }}
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Grid container spacing={2} sx={{ justifyContent: 'flex-start' }}>
        {filteredSnacks.map((snack) => {
          // Count how many of this snack are already in the cart
          const countInCart = cart.filter(item => item.SnackId === snack.SnackId).length;
          
          return (
          <Grid 
            item 
            xs={6} 
            sm={4} 
            md={4} 
            key={snack.SnackId} 
            sx={{ 
              display: 'flex',
              maxWidth: { xs: '45%', sm: '31.33%' }, // 2 items on mobile, 3 on larger screens
              flexBasis: { xs: '45%', sm: '31.33%' }
            }}
          >
            <Card 
              className="snack-card" 
              sx={{ 
                width: '100%',
                height: { xs: 420, sm: 380 }, // Larger on mobile 2x2, standard on desktop 3x3
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 240, sm: 200 }, // Larger image on mobile, standard on desktop
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f5'
                }}
              >
                <Box
                  component="img"
                  src={snack.ImageUrl || "https://via.placeholder.com/600x400?text=No+Image"}
                  alt={snack.Name}
                  sx={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain'
                  }}
                />
              </Box>
              <CardContent sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                p: { xs: 2, sm: 2 }, // Consistent padding
                px: { xs: 2.5, sm: 2.5 }, // Breathing room on both
                height: { xs: 180, sm: 180 } // Consistent content height
              }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography 
                    variant="h6" 
                    component="div"
                    sx={{
                      fontSize: { xs: '1.1rem', sm: '1rem' }, // Larger on mobile 2x2, standard on desktop 3x3
                      fontWeight: 600,
                      lineHeight: 1.4,
                      height: { xs: '3em', sm: '2.8em' }, // More height on mobile
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      textOverflow: 'ellipsis',
                      mb: { xs: 1, sm: 0.5 }, // More margin on mobile, tight on desktop
                      px: 0.5
                    }}
                    title={snack.Name}
                  >
                    {snack.Name}
                  </Typography>
                  <Typography 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: { xs: '1.2rem', sm: '1.1rem' }, // Larger on mobile, standard on desktop
                      fontWeight: 600,
                      color: '#1976d2',
                      px: 0.5,
                      mb: { xs: 0.5, sm: 0.25 }
                    }}
                  >
                    ${typeof snack.Price === 'number' ? snack.Price.toFixed(2) : '0.00'}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mt: { xs: 0.5, sm: 0.25 },
                      fontSize: { xs: '0.9rem', sm: '0.85rem' }, // Larger on mobile, standard on desktop
                      px: 0.5
                    }}
                  >
                    In Stock: {snack.Stock}
                  </Typography>
                </Box>
                {countInCart === 0 ? (
                  <Button 
                    variant="contained" 
                    fullWidth
                    size="medium"
                    sx={{ 
                      mt: 1,
                      py: { xs: 0.5, sm: 1 },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      fontWeight: 600,
                      minHeight: { xs: '32px', sm: '40px' }
                    }}
                    onClick={() => handleAddToCart(snack)}
                    disabled={snack.Stock <= 0}
                  >
                    ADD TO CART
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveFromCart(snack)}
                      sx={{
                        border: '1px solid #1976d2',
                        borderRadius: '4px 0 0 4px',
                        '&:hover': { backgroundColor: '#e3f2fd' }
                      }}
                    >
                      <Remove />
                    </IconButton>
                    <Typography 
                      sx={{ 
                        px: 2, 
                        py: '3px',
                        borderTop: '1px solid #1976d2',
                        borderBottom: '1px solid #1976d2',
                        minWidth: '40px',
                        textAlign: 'center',
                        fontWeight: 600
                      }}
                    >
                      {countInCart}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleAddToCart(snack)}
                      disabled={countInCart >= snack.Stock}
                      sx={{
                        border: '1px solid #1976d2',
                        borderRadius: '0 4px 4px 0',
                        '&:hover': { backgroundColor: '#e3f2fd' }
                      }}
                    >
                      <Add />
                    </IconButton>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

export default SnackList;