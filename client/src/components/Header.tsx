import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';

const Header: React.FC = () => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        {/* Left: App Name */}
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Eldercare
        </Typography>

        {/* Right: Nav Links */}
        <Box display="flex" gap={2}>
          <Button color="inherit" href="/dashboard">
            Dashboard
          </Button>
          <Button color="inherit" href="/profile">
            Profile
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
