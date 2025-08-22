import React, { useState, useEffect, useRef } from 'react';
import { Typography, Box, Button, CircularProgress, Alert, IconButton, Badge, Avatar } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import SnackList from './SnackList';
import Cart from './Cart';
import AddBalanceModal from './AddBalanceModal';
import AdminPage from './AdminPage';
import Profile from './Profile';
import SnackRequestForm from './SnackRequestForm';

function Dashboard({ user, onLogout, updateUser, cart, setCart }) {
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState({ message: '', severity: 'success' });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [view, setView] = useState('dashboard');
  
  // --- NEW: Refs for animation ---
  const balanceRef = useRef(null); // A reference to the balance text element
  const plusRef = useRef(null); // Floating +delta element
  const previousBalance = useRef(user.Balance); // Store the previous balance

  // Celebrate animation when balance increases (e.g., add funds)
  const runCelebrateAnimation = async () => {
    if (!balanceRef.current) return;
    try {
      const mod = await import('animejs');
      const anime = mod.default || mod;

      // Pulse the balance value
      anime.timeline()
        .add({
          targets: balanceRef.current,
          scale: [1, 1.2],
          color: ['#000', '#2e7d32'],
          duration: 250,
          easing: 'easeOutExpo',
        })
        .add({
          targets: balanceRef.current,
          scale: 1,
          color: '#000',
          duration: 600,
          easing: 'easeOutElastic(1, .5)',
        }, '-=100');

      // Coin burst particles from balance location
      const rect = balanceRef.current.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = `${originX}px`;
      container.style.top = `${originY}px`;
      container.style.pointerEvents = 'none';
      container.style.zIndex = '9999';
      document.body.appendChild(container);

      const particleCount = 22;
      const particles = [];
      for (let i = 0; i < particleCount; i += 1) {
        const el = document.createElement('span');
        const size = 10 + Math.random() * 8;
        el.style.position = 'absolute';
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = '50%';
        el.style.background = 'radial-gradient(circle at 30% 30%, #fff 0%, #ffe082 20%, #ffca28 50%, #ffa000 100%)';
        el.style.boxShadow = '0 0 6px rgba(255, 193, 7, 0.6)';
        el.style.opacity = '0';
        container.appendChild(el);
        particles.push(el);
      }

      anime({
        targets: particles,
        translateX: () => anime.random(-220, 220),
        translateY: () => anime.random(-260, -120),
        rotate: () => anime.random(-360, 360),
        scale: [1, 0.8],
        opacity: [{ value: 1, duration: 1 }, { value: 0, duration: 700, delay: 300 }],
        duration: 900,
        easing: 'easeOutCubic',
        complete: () => container.remove(),
      });
    } catch {
      // If anime fails, do nothing (counter animation still runs)
    }
  };

  const fetchSnacks = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5106/api/snacks');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      // Normalize backend camelCase to PascalCase for UI components
      const normalized = (Array.isArray(data) ? data : []).map((s) => ({
        SnackId: s.SnackId ?? s.snackId,
        Name: s.Name ?? s.name,
        Price: s.Price ?? s.price,
        Stock: s.Stock ?? s.stock,
        ImageUrl: s.ImageUrl ?? s.imageUrl,
        IsAvailable: s.IsAvailable ?? s.isAvailable,
      }));
      setSnacks(normalized);
    } catch (error) {
      setError('Failed to fetch snacks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnacks();
  }, []);

  // --- Animation Effect ---
  useEffect(() => {
    const delta = (typeof previousBalance.current === 'number' ? user.Balance - previousBalance.current : 0);
    
    if (delta !== 0 && balanceRef.current && plusRef.current) {
      // Reset the element completely before starting new animation
      plusRef.current.style.transition = 'none';
      plusRef.current.style.transform = 'translateY(0px)';
      plusRef.current.style.opacity = '0';
      
      // Set up the delta indicator
      const sign = delta > 0 ? '+$' : '-$';
      const displayValue = Math.abs(delta).toFixed(2);
      plusRef.current.textContent = `${sign}${displayValue}`;
      plusRef.current.style.color = delta > 0 ? '#4caf50' : '#f44336';
      
      // Force reflow to ensure reset is applied
      plusRef.current.offsetHeight;
      
      // Show the element
      plusRef.current.style.opacity = '1';
      
      // Start animation after a tiny delay
      setTimeout(() => {
        if (plusRef.current) {
          plusRef.current.style.transition = 'all 1.2s ease-out';
          plusRef.current.style.transform = 'translateY(-40px)';
          plusRef.current.style.opacity = '0';
        }
      }, 50);
      
      // Reset transition after animation completes
      setTimeout(() => {
        if (plusRef.current) {
          plusRef.current.style.transition = 'none';
        }
      }, 1300);
      
      // Animate the balance number counting
      let startValue = previousBalance.current || 0;
      let endValue = user.Balance;
      let startTime = null;
      
      const animateNumber = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / 1500, 1);
        
        const currentValue = startValue + (endValue - startValue) * progress;
        if (balanceRef.current) {
          balanceRef.current.textContent = `$${currentValue.toFixed(2)}`;
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateNumber);
        }
      };
      
      requestAnimationFrame(animateNumber);
    }
    
    previousBalance.current = user.Balance;
  }, [user.Balance]);

  const formattedBalance = typeof user.Balance === 'number' 
    ? user.Balance.toFixed(2) 
    : '0.00';

  if (view === 'admin' && user?.IsAdmin) {
    return (
      <Box>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 2,
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            textAlign: { xs: 'center', sm: 'left' },
            mb: { xs: 1, sm: 0 }
          }}>
            {user.ProfilePictureUrl && (
              <Avatar 
                src={user.ProfilePictureUrl} 
                alt={user.DisplayName} 
                sx={{ mr: 2, width: 56, height: 56 }} 
              />
            )}
            <div>
              <Typography variant="h5" sx={{ 
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}>
                Welcome, {user.DisplayName}!
              </Typography>
              <Typography variant="h6" sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}>
                Your current balance is: ${formattedBalance}
              </Typography>
            </div>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            width: { xs: '100%', sm: 'auto' }
          }}>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => setView('dashboard')} 
              sx={{ 
                mr: { xs: 0, sm: 1 },
                width: { xs: '100%', sm: 'auto' },
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}
            >
              BACK TO DASHBOARD
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={onLogout}
              sx={{ 
                width: { xs: '100%', sm: 'auto' },
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}
            >
              LOGOUT
            </Button>
          </Box>
        </Box>
        <AdminPage user={user} setView={setView} />
      </Box>
    );
  }

  if (view === 'profile') {
    return (
      <Box>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 2,
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography variant="h5" sx={{ 
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            textAlign: { xs: 'center', sm: 'left' }
          }}>
            My Profile
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            width: { xs: '100%', sm: 'auto' }
          }}>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => setView('dashboard')} 
              sx={{ 
                mr: { xs: 0, sm: 1 },
                width: { xs: '100%', sm: 'auto' },
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}
            >
              BACK TO DASHBOARD
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={onLogout}
              sx={{ 
                width: { xs: '100%', sm: 'auto' },
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}
            >
              LOGOUT
            </Button>
          </Box>
        </Box>
        <Profile user={user} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, // Stack vertically on mobile
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, // Full width on mobile
        mb: 2,
        gap: { xs: 2, sm: 0 } // Add gap between sections on mobile
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          textAlign: { xs: 'center', sm: 'left' }, 
          mb: { xs: 1, sm: 0 }
        }}>
          {user.ProfilePictureUrl && (
            <Avatar 
              src={user.ProfilePictureUrl} 
              alt={user.DisplayName} 
              sx={{ mr: 2, width: 56, height: 56 }} 
            />
          )}
          <div>
            <Typography variant="h5" sx={{ 
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}>
              Welcome, {user.DisplayName}!
            </Typography>
            <Typography variant="h6" sx={{ 
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}>
            Your current balance is:{' '}
            <Box component="span" sx={{ position: 'relative', display: 'inline-block' }}>
              {/* Animated balance value */}
              <span 
                ref={balanceRef}
                style={{ 
                  color: user.Balance < 0 ? '#d32f2f' : 'inherit',
                  fontWeight: user.Balance < 0 ? 'bold' : 'normal'
                }}
              >
                ${(typeof user.Balance === 'number' ? user.Balance : 0).toFixed(2)}
                {user.Balance < 0 && ' (owes)'}
              </span>
              {/* Floating +delta badge */}
              <Box
                component="span"
                ref={plusRef}
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: -24,
                  fontWeight: 700,
                  opacity: 0,
                }}
              >
                +0.00
              </Box>
            </Box>
          </Typography>
        </div>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' }, // Stack buttons vertically on mobile
          gap: { xs: 1, sm: 0 }, // Add gap between buttons on mobile
          width: { xs: '100%', sm: 'auto' }
        }}>
          {user?.IsAdmin && (
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={() => setView('admin')} 
              sx={{ 
                mr: { xs: 0, sm: 1 },
                width: { xs: '100%', sm: 'auto' }, // Full width on mobile
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}
            >
              OPEN ADMIN PANEL
            </Button>
          )}
          <Button 
            variant="contained" 
            onClick={() => setIsBalanceModalOpen(true)} 
            sx={{ 
              mr: { xs: 0, sm: 2 },
              width: { xs: '100%', sm: 'auto' }, // Full width on mobile
              fontSize: { xs: '0.875rem', sm: '0.875rem' }
            }}
          >
            ADD BALANCE
          </Button>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: { xs: 'center', sm: 'flex-start' },
            width: { xs: '100%', sm: 'auto' },
            gap: { xs: 2, sm: 2 }
          }}>
            <IconButton 
              color="primary" 
              onClick={() => setView('profile')} 
              sx={{ 
                mr: { xs: 0, sm: 1 }
              }}
            >
              <PersonIcon />
            </IconButton>
            <IconButton 
              color="primary" 
              onClick={() => setIsCartOpen(true)} 
              sx={{ 
                mr: { xs: 0, sm: 2 }
              }}
            >
              <Badge badgeContent={cart.length} color="error">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={onLogout}
              sx={{ 
                width: { xs: 'auto', sm: 'auto' },
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}
            >
              LOGOUT
            </Button>
          </Box>
        </Box>
      </Box>

      {purchaseStatus.message && (
        <Alert severity={purchaseStatus.severity} sx={{ mb: 2, mt: 2 }} onClose={() => setPurchaseStatus({ message: ''})}>
          {purchaseStatus.message}
        </Alert>
      )}
      
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && !error && (
        <SnackList 
          snacks={snacks} 
          setSnacks={setSnacks}
          cart={cart}
          setCart={setCart}
        />
      )}

      <Cart 
        cart={cart} 
        setCart={setCart}
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        user={user}
        updateUser={updateUser}
        setPurchaseStatus={setPurchaseStatus}
        refreshSnacks={fetchSnacks}
      />
      <AddBalanceModal 
        open={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        user={user}
        updateUser={updateUser}
      />
      <SnackRequestForm user={user} />
    </Box>
  );
}

export default Dashboard;