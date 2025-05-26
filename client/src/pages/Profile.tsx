import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Container,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';

type LogType = 'Visit' | 'Intervention' | 'Distribution' | 'Training' | 'Survey' | 'Emergency';

interface Log {
  title: string;
  date: string;
  detail: string;
  type: LogType;
  year: number;
}

const mockLogs: Log[] = [
  { title: 'Visited Desa A', date: 'April 4, 2025', detail: 'Measured 12 Lansia', type: 'Visit', year: 2025 },
  { title: 'Intervention Completed in Kecamatan X', date: 'April 3, 2025', detail: '5 cases handled', type: 'Intervention', year: 2025 },
  { title: 'Distributed Medicine', date: 'April 2, 2025', detail: 'Supplied essentials to 3 villages', type: 'Distribution', year: 2025 },
  { title: 'Follow-up Visit in Desa B', date: 'April 1, 2025', detail: 'Reviewed 8 patient outcomes', type: 'Visit', year: 2025 },
  { title: 'Community Health Education', date: 'March 30, 2024', detail: 'Held workshop for 25 attendees', type: 'Training', year: 2024 },
  { title: 'Emergency Support in Desa C', date: 'March 28, 2024', detail: 'Addressed 2 urgent cases', type: 'Emergency', year: 2024 },
  { title: 'Mobile Clinic Operation', date: 'March 27, 2024', detail: 'Served 17 individuals', type: 'Visit', year: 2024 },
  { title: 'Nutrition Survey', date: 'March 26, 2023', detail: 'Collected data from 4 locations', type: 'Survey', year: 2023 },
  { title: 'Vaccination Program', date: 'March 25, 2023', detail: 'Administered 40+ doses', type: 'Distribution', year: 2023 },
  { title: 'Caregiver Training Session', date: 'March 24, 2023', detail: 'Trained 6 local workers', type: 'Training', year: 2023 },
];

const Profile: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const filteredLogs = mockLogs.filter(log => {
    const matchesTitle = log.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType ? log.type === filterType : true;
    const matchesYear = filterYear ? log.year === parseInt(filterYear) : true;
    return matchesTitle && matchesType && matchesYear;
  });

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Container
        maxWidth="lg"
        sx={{
          width: '80%',
          my: 4,
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Profile Card */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 3,
            mb: 4,
            background: 'linear-gradient(to bottom right, #dc6023, #e8823f)',
          }}
        >
          <Avatar sx={{ width: 64, height: 64, mr: 3 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              John Doe
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              (Nurse/Worker)
            </Typography>
          </Box>
        </Paper>

        {/* Search & Filter Panel */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '2px solid #E98B52',
            backgroundColor: '#fff',
            mb: 3,
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Search by Title"
                variant="outlined"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Filter by Type"
                variant="outlined"
                fullWidth
                select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {Array.from(new Set(mockLogs.map(log => log.type))).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Filter by Year"
                variant="outlined"
                fullWidth
                select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {Array.from(new Set(mockLogs.map(log => log.year)))
                  .sort((a, b) => b - a)
                  .map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Activity Log */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '2px solid #007bff',
            backgroundColor: '#E98B52',
            flexGrow: 1,
            overflowY: 'auto',
          }}
        >
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#fff' }}>
            Activity Log
          </Typography>
          <Divider sx={{ mb: 2, backgroundColor: '#000' }} />

          <List disablePadding>
            {filteredLogs.length === 0 && (
              <Typography variant="body1" sx={{ color: '#000' }}>
                No matching records found.
              </Typography>
            )}
            {filteredLogs.map((log, index) => (
              <ListItem
                key={index}
                divider
                sx={{
                  py: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{ color: '#000' }}
                    >
                      {log.title}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{ color: '#000', mt: 0.5, whiteSpace: 'normal' }}
                    >
                      {log.date}
                      <br />
                      {log.detail}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  );
};

export default Profile;
