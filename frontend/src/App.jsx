// File: frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import LoginPage from './components/LoginPage';
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
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [loginError, setLoginError] = useState('');
  const [cart, setCart] = useState([]);

  const handleLogin = async () => {
    try {
      // Sync with main site authentication
      const response = await fetch(`${API_BASE_URL}/api/auth/sync-main-site`, {
        method: 'POST',
        credentials: 'include', // Important: send cookies from main site
      });

      if (!response.ok) {
        // Not authenticated on main site - redirect there
        window.location.href = 'https://ftcemp.byui.edu/auth/login';
        return;
      }

      const userData = await response.json();
      updateUser(userData);
      setLoginError('');
    } catch (error) {
      setLoginError('An error occurred during authentication.');
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/signout`, {
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
    setUser(null);
    setCart([]);
  };
  
  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        // First, try to sync with main site
        const response = await fetch(`${API_BASE_URL}/api/auth/sync-main-site`, {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          updateUser(userData);
        } else {
          // Not authenticated on main site or sync failed
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('user');
        setUser(null);
      }
    };

    // Only check auth if we don't already have user
    if (!user) {
      checkAuth();
    }
  }, []);


  return (
    <ThemeProvider theme={customTheme}>
      <CssBaseline />
      {user ? (
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
              onLogout={handleLogout} 
              updateUser={updateUser} 
              cart={cart}
              setCart={setCart}
            />
          </Container>
        </Box>
      ) : (
        <LoginPage onLogin={handleLogin} error={loginError} setError={setLoginError} />
      )}
    </ThemeProvider>
  );
}

export default App;