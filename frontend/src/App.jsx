import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// Import our new components
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  // 1. Create a state variable for the user.
  // It starts as 'null', meaning no one is logged in.
  const [user, setUser] = useState(null);

  // 2. Create a mock login function.
  // This function will be passed to the LoginPage component.
  const handleLogin = () => {
    // For now, we'll just set a fake user object.
    // Later, this will be replaced with the real data from our API.
    const mockUser = {
      userId: 1,
      email: "test.user@byui.edu",
      displayName: "Test User",
      balance: 5.00,
      isAdmin: false
    };
    setUser(mockUser);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container component="main" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Snack Tracker
        </Typography>
        
        {/* 3. Conditional Rendering */}
        {/* If 'user' is null, show the LoginPage. */}
        {/* Otherwise, show the Dashboard. */}
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
