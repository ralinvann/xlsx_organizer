import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import Header from '../components/Header';
import Footer from '../components/Footer';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const stats = [
  { label: 'Hasil Pengukuran Lansia', value: '15,320' },
  { label: 'Sasaran Lansia (Data BPS)', value: '12,000' },
  { label: 'Jumlah Lansia Diukur', value: '14,500' },
  { label: 'Persentase Lansia Diukur', value: '96%' },
  { label: 'Jumlah Lansia dengan Kondisi Kritis', value: '2,300' },
  { label: 'Jumlah Lansia yang Diintervensi', value: '11,500' },
];

const filters = ['Date range', 'Kabupaten', 'Kecamatan', 'Kelurahan', 'Desa', 'Puskesmas'];

type ChartProps = {
  title: string;
  labels: string[];
  data: number[];
};

const DonutChart: React.FC<ChartProps> = ({ title, labels, data }) => (
  <Box height={300}>
    <Typography variant="h6" mb={2} textAlign="center">
      {title}
    </Typography>
    <Doughnut
      data={{
        labels,
        datasets: [
          {
            data,
            backgroundColor: ['#4caf50', '#2196f3', '#f44336', '#ff9800', '#9c27b0'],
          },
        ],
      }}
      options={{
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
        maintainAspectRatio: false,
      }}
    />
  </Box>
);

const BarChart: React.FC<ChartProps> = ({ title, labels, data }) => (
  <Box height={300}>
    <Typography variant="h6" mb={2} textAlign="center">
      {title}
    </Typography>
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: title,
            data,
            backgroundColor: '#2196f3',
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
      }}
    />
  </Box>
);

const Dashboard: React.FC = () => {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Header />

      <Box display="flex" flexGrow={1}>
        {/* Sidebar Filters */}
        <Box width="20%" bgcolor="#e0e0e0" p={3}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Filters
          </Typography>
          {filters.map((filter) => (
            <FormControl fullWidth margin="normal" key={filter}>
              <InputLabel>{filter}</InputLabel>
              <Select defaultValue="" label={filter}>
                <MenuItem value="">All</MenuItem>
              </Select>
            </FormControl>
          ))}
        </Box>

        {/* Main Content */}
        <Box flexGrow={1} p={4}>
          {/* Dropdown Selector */}
          <Box mb={3} textAlign="left">
            <FormControl>
              <InputLabel>View Mode</InputLabel>
              <Select defaultValue="list" label="View Mode">
                <MenuItem value="list">List</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Title */}
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Pengukuran dan Intervensi Lansia
          </Typography>

          {/* Stats Cards */}
          <Grid container spacing={3} mb={4}>
            {stats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
                  <Typography variant="subtitle1">{stat.label}</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* 2x3 Chart Grid */}
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 3, height: 350 }}>
                <DonutChart
                  title="Gender Breakdown"
                  labels={['Female', 'Male']}
                  data={[51, 49]}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 3, height: 350 }}>
                <DonutChart
                  title="Income Level"
                  labels={['Low', 'Medium', 'High']}
                  data={[32, 32, 36]}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 3, height: 350 }}>
                <DonutChart
                  title="Education Level"
                  labels={['Below Secondary', 'Upper Secondary', 'University']}
                  data={[39, 23, 39]}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 3, height: 350 }}>
                <DonutChart
                  title="Intervention Status"
                  labels={['Intervened', 'Not Intervened']}
                  data={[11500, 3820]}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 3, height: 350 }}>
                <BarChart
                  title="Lansia by Age Group"
                  labels={['0-14', '15-24', '25-54', '55-64', '65+']}
                  data={[150, 90, 670, 200, 350]}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 3, height: 350 }}>
                <BarChart
                  title="Interventions by Puskesmas"
                  labels={['Puskesmas A', 'Puskesmas B', 'Puskesmas C', 'Puskesmas D']}
                  data={[3200, 2800, 1800, 1700]}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
};

export default Dashboard;
