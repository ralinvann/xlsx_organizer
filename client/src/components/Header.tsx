import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Account', path: '/profile' },
    { label: 'File', path: '/upload' },
    { label: 'Help', path: '/help' },
  ];

  // Avatar menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleAccount = () => {
    navigate('/profile');
  };

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
        {/* Clickable logo and app name */}
        <Box
          component={Link}
          to="/"
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}
        >
          <InsertPhotoIcon sx={{ fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold">
            ElderCare Data Network
          </Typography>
        </Box>

        {/* Navigation links */}
        <Box display="flex" alignItems="center" gap={2}>
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

          {/* Avatar dropdown if logged in */}
          {user && (
            <>
              <IconButton onClick={handleMenuClick} sx={{ ml: 2 }}>
                <Avatar sx={{ width: 36, height: 36 }}>
                  {user.firstName?.[0] || '?'}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem onClick={() => { handleClose(); handleAccount(); }}>
                  Account
                </MenuItem>
                <MenuItem onClick={() => { handleClose(); handleLogout(); }}>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
