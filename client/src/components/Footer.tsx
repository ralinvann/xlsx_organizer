import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      py={2}
      px={4}
      bgcolor="#f5f5f5"
      textAlign="center"
      mt="auto"
    >
      <Typography variant="body2" color="textSecondary">
        © {new Date().getFullYear()} Eldercare Platform - All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
