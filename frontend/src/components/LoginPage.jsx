// File: frontend/src/components/LoginPage.jsx

import React, { useEffect } from 'react';
import { 
  Button, 
  Container, 
  Typography, 
  Box, 
  Alert, 
  Collapse, 
  Card, 
  CardContent,
  Link,
  Divider
} from '@mui/material';

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
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container component="main" maxWidth="sm">
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            sx={{
              color: '#006EB6',
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 2,
              textShadow: '0 2px 4px rgba(0, 110, 182, 0.3)',
              background: 'linear-gradient(45deg, #006EB6, #4A90E2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            FTC-Store
          </Typography>
        </Box>

        {/* Login Card */}
        <Card
          sx={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            borderRadius: 3,
            border: '1px solid rgba(0, 110, 182, 0.1)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography
              component="h2"
              variant="h5"
              sx={{
                textAlign: 'center',
                mb: 3,
                color: '#333',
                fontWeight: '500',
              }}
            >
              Sign In to Continue
            </Typography>

            <Collapse in={!!error}>
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            </Collapse>

            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                mb: 3,
                color: '#666',
              }}
            >
              Use your BYU-Idaho Google account to access the FTC-Store
            </Typography>

            <Button
              onClick={onLogin}
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 2,
                mb: 3,
                py: 1.5,
                backgroundColor: '#006EB6',
                '&:hover': {
                  backgroundColor: '#005694',
                },
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: '500',
              }}
            >
              Sign In with Google
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Help Links */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Link
                href="https://ftcemp.byui.edu/"
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
                sx={{
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Need Help?
              </Link>
            </Box>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box
          sx={{
            mt: 4,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#666',
            }}
          >
            © 2025 Brigham Young University-Idaho
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default LoginPage;