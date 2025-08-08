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

  const handleLogin = () => {
    window.location.href = 'http://localhost:5106/api/auth/signin-google';
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = 'http://localhost:5106/api/auth/signout';
  };
  
  // --- NEW FUNCTION TO UPDATE USER STATE ---
  // We pass this function down so child components can update the user's balance.
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
        updateUser(userData); // Use our new function to set the user
        window.history.replaceState({}, document.title, "/");
      } catch (error) {
        console.error("Failed to parse user data from URL", error);
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
      <Container component="main" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Snack Tracker
        </Typography>
        
        {user ? (
          // Pass the user and the updateUser function to the Dashboard
          <Dashboard user={user} onLogout={handleLogout} updateUser={updateUser} />
        ) : (
          <LoginPage onLogin={handleLogin} error={loginError} setError={setLoginError} />
        )}

      </Container>
    </ThemeProvider>
  );
}

export default App;