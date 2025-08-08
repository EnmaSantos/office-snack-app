// File: frontend/src/components/LoginPage.jsx

import React, { useEffect } from 'react';
import { Button, Container, Typography, Box, Alert, Collapse } from '@mui/material';

function LoginPage({ onLogin, error, setError }) {

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);

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