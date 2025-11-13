// File: frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Dashboard from './components/Dashboard';
import { API_BASE_URL } from './config';

const customTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#006EB6',
    },
    background: {
      default: '#FFFFFF',
      paper: '#f5f5f5',
    },
    text: {
      primary: '#000000',
      secondary: '#4B4443',
    },
  },
});

function App() {
  // Don't initialize from localStorage - always sync with main site
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  const handleGoHome = () => {
    // Redirect back to the main FTEC employee website
    window.location.href = 'https://ftcemp.byui.edu';
  };
  
  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        // Try to sync with main site
        const response = await fetch(`${API_BASE_URL}/api/auth/sync-main-site`, {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          updateUser(userData);
          setLoading(false);
        } else {
          // Not authenticated on main site - redirect to login
          window.location.href = 'https://ftcemp.byui.edu/auth/login';
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // On error, redirect to login
        window.location.href = 'https://ftcemp.byui.edu/auth/login';
      }
    };

    // Always check auth on mount to get fresh data from main site
    checkAuth();
  }, []);


  return (
    <ThemeProvider theme={customTheme}>
      <CssBaseline />
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            gap: 2,
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Checking authentication...
          </Typography>
        </Box>
      ) : (
        <Box>
          {/* BYU-Idaho Header */}
          <Box
            sx={{
              backgroundColor: '#006EB6',
              color: 'white',
              py: 2,
              mb: 3,
              boxShadow: '0 2px 8px rgba(0, 110, 182, 0.3)',
            }}
          >
            <Container maxWidth="lg">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 'bold',
                      background: 'linear-gradient(45deg, #ffffff, #e3f2fd)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      mr: 2,
                    }}
                  >
                    FTC-Store
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      opacity: 0.9,
                      fontWeight: '300',
                    }}
                  >
                    BYU-Idaho Faculty Technology Center
                  </Typography>
                </Box>
              </Box>
            </Container>
          </Box>
          
          <Container component="main" maxWidth="lg">
            <Dashboard 
              user={user} 
              onGoHome={handleGoHome} 
              updateUser={updateUser} 
              cart={cart}
              setCart={setCart}
            />
          </Container>
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;