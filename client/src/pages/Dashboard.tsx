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
import { useEffect, useState } from 'react';
import axios from 'axios';

interface Populasi {
  lakiLaki: number;
  perempuan: number;
  total: number;
}

interface Sasaran {
  kategori: string;
  populasi: Populasi;
}

interface Desa {
  desa: string;
  sasaran: Sasaran[];
  totalSasaran: number;
}

interface Puskesmas {
  name: string;
  kabupaten: string;
  desaList: Desa[];
}

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
  const [data, setData] = useState<Puskesmas[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get<Puskesmas[]>('http://localhost:5000/api/puskesmas');
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch Puskesmas data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

        {/* Desa and Sasaran Table */}
        <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#fff3e6' }} elevation={4}>
          <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
            Detail Sasaran Lansia per Desa
          </Typography>

          {data.length === 0 ? (
            <Typography>Loading data...</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fcd2b6' }}>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Desa</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Kategori</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Laki-laki</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Perempuan</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data[0].desaList.map((desa) =>
                    desa.sasaran.map((sasaran, idx) => (
                      <tr key={`${desa.desa}-${idx}`}>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                          {idx === 0 ? desa.desa : ''}
                        </td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{sasaran.kategori}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{sasaran.populasi.lakiLaki}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{sasaran.populasi.perempuan}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{sasaran.populasi.total}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard;
