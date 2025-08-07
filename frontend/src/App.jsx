import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

// 1. Define your custom color palette.
const customTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#006EB6', // Your blue color
    },
    background: {
      default: '#000000', // Black
      paper: '#4B4443',   // Dark Gray
    },
    text: {
      primary: '#FFFFFF', // White
      secondary: '#949598', // Light Gray
    },
  },
});

function App() {
  const [user, setUser] = useState(null);

  // 2. This function now handles the real login.
  const handleLogin = () => {
    // Redirect the user to our backend's Google Sign-In endpoint.
    window.location.href = 'http://localhost:5106/api/auth/signin-google';
  };
  
  // This is a placeholder for a future step to get user data after login.
  useEffect(() => {
    // In the future, we will add logic here to check if the user is already logged in.
  }, []);


  return (
    // 3. Use the new customTheme.
    <ThemeProvider theme={customTheme}>
      <CssBaseline />
      <Container component="main" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Snack Tracker
        </Typography>
        
        {user ? (
          <Dashboard user={user} />
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}

      </Container>
    </ThemeProvider>
  );
}

export default App;
