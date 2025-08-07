import React from 'react';
import { Button, Container, Typography, Box } from '@mui/material';

// The 'onLogin' prop is a function that will be passed down from App.jsx
// to handle the login logic.
function LoginPage({ onLogin }) {
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
        <Box sx={{ mt: 1 }}>
          {/* We will replace this with a real Google Sign-In button later */}
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
