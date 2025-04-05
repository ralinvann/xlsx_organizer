import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Profile: React.FC = () => {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Header />

      <Box flexGrow={1} p={4} bgcolor="#f9f9f9">
        {/* Profile Card */}
        <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 3, mb: 4 }}>
          <Avatar sx={{ width: 64, height: 64, mr: 3 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              John Doe
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Role: Nurse
            </Typography>
          </Box>
        </Paper>

        {/* Activity Log */}
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Activity Log
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List>
            <ListItem>
              <ListItemText
                primary="Visited Desa A"
                secondary="April 4, 2025 - Measured 12 Lansia"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Intervention Completed in Kecamatan X"
                secondary="April 3, 2025 - 5 cases handled"
              />
            </ListItem>
            {/* Add more logs or map from data source */}
          </List>
        </Paper>
      </Box>

      <Footer />
    </Box>
  );
};

export default Profile;
