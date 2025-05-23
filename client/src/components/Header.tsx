import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';

const Header: React.FC = () => {
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
        {/* Left: App Name */}
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          ElderCare Data Network
        </Typography>

        {/* Right: Nav Links */}
        <Box display="flex" gap={2}>
          <Button sx={{ color: 'white' }} href="/dashboard">
            Dashboard
          </Button>
          <Button sx={{ color: 'white' }} href="/profile">
            Account
          </Button>
          <Button sx={{ color: 'white' }} href="/inbox">
            Inbox
          </Button>
          <Button sx={{ color: 'white' }} href="/help">
            Help
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
