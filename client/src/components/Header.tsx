import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto'; // placeholder for logo

const Header: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Account', path: '/profile' },
    { label: 'File', path: '/upload' },
    { label: 'Help', path: '/help' },
  ];

  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        backgroundImage: 'linear-gradient(to right, #E98B52, #CC561F)',
        color: '#fff',
      }}
    >
      <Toolbar>
        {/* Logo and App Name */}
        <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
          <InsertPhotoIcon sx={{ fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold">
            ElderCare Data Network
          </Typography>
        </Box>

        {/* Nav Links */}
        <Box display="flex" gap={3}>
          {navLinks.map((link) => (
            <Button
              key={link.path}
              component={NavLink}
              to={link.path}
              sx={{
                color: 'white',
                fontWeight: 'bold',
                borderBottom: location.pathname === link.path ? '3px solid white' : 'none',
                borderRadius: 0,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {link.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
