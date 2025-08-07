// File: frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

const customTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#006EB6',
    },
    background: {
      default: '#000000',
      paper: '#4B4443',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#949598',
    },
  },
});

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  // --- NEW STATE FOR ERROR MESSAGES ---
  const [loginError, setLoginError] = useState('');

  const handleLogin = () => {
    window.location.href = 'http://localhost:5106/api/auth/signin-google';
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = 'http://localhost:5106/api/auth/signout';
  };
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('user');
    const errorParam = params.get('error'); // Get the error parameter

    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        window.history.replaceState({}, document.title, "/");
      } catch (error) {
        console.error("Failed to parse user data from URL", error);
        setLoginError("An unexpected error occurred during login.");
      }
    } else if (errorParam) {
        // --- NEW ERROR HANDLING LOGIC ---
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
      <Container component="main" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Snack Tracker
        </Typography>
        
        {user ? (
          <Dashboard user={user} onLogout={handleLogout} />
        ) : (
          // Pass the error message and setter to the LoginPage
          <LoginPage onLogin={handleLogin} error={loginError} setError={setLoginError} />
        )}

      </Container>
    </ThemeProvider>
  );
}

export default App;