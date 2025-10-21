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

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/signin-google`;
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setCart([]);
    window.location.href = `${API_BASE_URL}/api/auth/signout`;
  };
  
  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('user');
    const errorParam = params.get('error');

    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        updateUser(userData);
        window.history.replaceState({}, document.title, "/");
      } catch (error) {
        setLoginError("An unexpected error occurred during login.");
      }
    } else if (errorParam) {
        if (errorParam === 'invalid_domain') {
            setLoginError('Access Denied: Only byui.edu accounts are allowed.');
        } else {
            setLoginError('An error occurred during authentication.');
        }
        window.history.replaceState({}, document.title, "/");
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