import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const Admin: React.FC = () => {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Box flexGrow={1} display="flex" flexDirection="row" bgcolor="#fff7f2">
        {/* Left Sidebar Navigation */}
        <Box
          width="200px"
          bgcolor="#d75427"
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          p={2}
          sx={{
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            boxShadow: 3,
          }}
        >
          {['User Management', 'System Logs', 'Data Oversight', 'Settings'].map((label) => (
            <Button
              key={label}
              variant="contained"
              fullWidth
              sx={{
                my: 1,
                borderRadius: 8,
                backgroundColor: '#f5c19f',
                color: '#000',
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#f3b68b' },
              }}
            >
              {label}
            </Button>
          ))}
        </Box>

        {/* Main Content */}
        <Container
          maxWidth="lg"
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* User Database Section */}
          <Paper elevation={4} sx={{ p: 3, borderRadius: 3, backgroundColor: '#dc6023' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#000' }}>
              User Database
            </Typography>
            <TextField
              placeholder="Search users..."
              fullWidth
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2, bgcolor: '#fcd2b6', borderRadius: 2 }}
            />
            <List>
              <ListItem>
                <ListItemText primary="Name: Anna" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Name: Budi" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Name: Charles" />
              </ListItem>
            </List>
          </Paper>

          {/* System Logs Section */}
          <Paper elevation={4} sx={{ p: 3, borderRadius: 3, backgroundColor: '#dc6023' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#000' }}>
              System Logs
            </Typography>
            <TextField
              placeholder="Search logs..."
              fullWidth
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: '#fcd2b6', borderRadius: 2 }}
            />
          </Paper>

          {/* Permission Settings Section */}
          <Paper elevation={4} sx={{ p: 3, borderRadius: 3, backgroundColor: '#dc6023' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#000' }}>
              Permission Settings
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default Admin;
