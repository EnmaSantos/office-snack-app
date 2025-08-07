// File: frontend/src/components/LoginPage.jsx

import React, { useEffect } from 'react';
import { Button, Container, Typography, Box, Alert, Collapse } from '@mui/material';

// The component now accepts 'error' and 'setError' props.
function LoginPage({ onLogin, error, setError }) {

  // This useEffect hook will run whenever the 'error' prop changes.
  useEffect(() => {
    if (error) {
      // If there is an error, set a timer to clear it after 5 seconds.
      const timer = setTimeout(() => {
        setError(''); // Clear the error message
      }, 5000); // 5000 milliseconds = 5 seconds

      // Cleanup function to clear the timer if the component unmounts
      return () => clearTimeout(timer);
    }
  }, [error, setError]);


  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Welcome to Snack Tracker
        </Typography>

        {/* --- NEW ALERT COMPONENT --- */}
        {/* The Collapse component provides a nice animation. */}
        {/* The 'in' prop controls visibility based on whether 'error' has content. */}
        <Collapse in={!!error}>
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                {error}
            </Alert>
        </Collapse>

        <Box sx={{ mt: 1, width: '100%' }}>
          <Button
            onClick={onLogin}
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default LoginPage;