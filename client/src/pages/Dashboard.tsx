import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const stats = [
  { label: 'Hasil Pengukuran Lansia', value: '15,320' },
  { label: 'Sasaran Lansia (Data BPS)', value: '12,000' },
  { label: 'Jumlah Lansia Diukur', value: '14,500' },
  { label: 'Persentase Lansia Diukur', value: '96%' },
  { label: 'Jumlah Lansia dengan Kondisi Kritis', value: '2,300' },
  { label: 'Jumlah Lansia yang Diintervensi', value: '11,500' },
];

const filters = ['Date range', 'Kabupaten', 'Kecamatan', 'Kelurahan', 'Desa', 'Puskesmas'];

const barData = [
  { name: 'Desa A', measured: 78 },
  { name: 'Desa B', measured: 92 },
  { name: 'Desa C', measured: 84 },
];

const pieData = [
  { name: 'Desa A', value: 530 },
  { name: 'Desa B', value: 800 },
  { name: 'Desa C', value: 670 },
];

const COLORS = ['#f7833d', '#f7a45e', '#f9c48d'];

const Dashboard: React.FC = () => {
  return (
    <Box display="flex" flexGrow={1} bgcolor="#fff7f2">
      {/* Sidebar Filters */}
      <Box
        width="220px"
        bgcolor="#d75427"
        p={2}
        display="flex"
        flexDirection="column"
        alignItems="center"
        sx={{
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold" mb={2} color="#fff">
          Filters
        </Typography>
        {filters.map((filter) => (
          <FormControl
            key={filter}
            fullWidth
            size="small"
            variant="filled"
            sx={{ mb: 1, bgcolor: '#fff', borderRadius: 2 }}
          >
            <InputLabel>{filter}</InputLabel>
            <Select defaultValue="">
              <MenuItem value="">All</MenuItem>
            </Select>
          </FormControl>
        ))}
      </Box>

      {/* Right Content */}
      <Container maxWidth="xl" sx={{ py: 4, flexGrow: 1 }}>
        {/* Top 2x2 Cards */}
        <Grid container spacing={3} mb={4}>
          {/* Bar Chart */}
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={4}
              sx={{
                p: 2,
                height: 300,
                borderRadius: 3,
                backgroundColor: '#fcd2b6',
              }}
            >
              <Typography fontWeight="bold" textAlign="center" mb={1}>
                Bar Chart: Percentage of elderly people measured per village
              </Typography>
              <BarChart width={300} height={200} data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="measured" fill="#d75427" />
              </BarChart>
            </Paper>
          </Grid>

          {/* Donut Chart */}
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={4}
              sx={{
                p: 2,
                height: 300,
                borderRadius: 3,
                backgroundColor: '#fcd2b6',
              }}
            >
              <Typography fontWeight="bold" textAlign="center" mb={1}>
                Donut Chart: Proportion of elderly people across each village
              </Typography>
              <PieChart width={300} height={200}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </Paper>
          </Grid>

          {/* Recent Uploads */}
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={4}
              sx={{
                p: 4,
                height: 300,
                background: 'linear-gradient(to bottom, #fcd2b6, #f8b98d)',
                borderRadius: 3,
                textAlign: 'center',
              }}
            >
              <Typography fontWeight="bold">
                Recent uploads (available for nurses only)
              </Typography>
            </Paper>
          </Grid>

          {/* Upload Button */}
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={4}
              sx={{
                p: 4,
                height: 300,
                background: 'linear-gradient(to bottom, #fcd2b6, #f8b98d)',
                borderRadius: 3,
                textAlign: 'center',
              }}
            >
              <Typography fontWeight="bold">Press to Upload</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Bottom Stats Section */}
        <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#dc6023' }} elevation={4}>
          <Box mb={2}>
            <FormControl
              size="small"
              variant="outlined"
              sx={{
                minWidth: 140,
                backgroundColor: '#fff',
                borderRadius: '999px',
                overflow: 'hidden',
                boxShadow: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '999px',
                  paddingLeft: 1.5,
                  paddingRight: 1.5,
                },
                '& .MuiInputLabel-root': {
                  top: '-4px',
                  left: 12,
                },
              }}
            >
              <InputLabel id="list-label">List</InputLabel>
              <Select
                labelId="list-label"
                defaultValue="list"
                label="List"
                sx={{
                  borderRadius: '999px',
                  '& .MuiSelect-select': {
                    paddingY: '8px',
                    paddingX: '20px',
                  },
                }}
              >
                <MenuItem value="list">List</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Typography
            variant="h5"
            fontWeight="bold"
            textAlign="center"
            gutterBottom
            color="black"
          >
            Pengukuran dan Intervensi Lansia
          </Typography>

          <Grid container spacing={3}>
            {stats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper
                  elevation={5}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    borderRadius: 3,
                    backgroundColor: '#fcd2b6',
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="medium" color="black">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="black">
                    {stat.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard;
