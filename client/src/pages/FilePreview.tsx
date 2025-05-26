import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TableSortLabel,
} from '@mui/material';
import { useLocation } from 'react-router-dom';

type SortDirection = 'asc' | 'desc' | null;

const FilePreview: React.FC = () => {
  const location = useLocation();
  const rawData: string[][] = location.state?.data || [];

  const [sortConfig, setSortConfig] = useState<{
    columnIndex: number | null;
    direction: SortDirection;
  }>({ columnIndex: null, direction: null });

  const [data, setData] = useState<string[][]>(rawData);

  if (!rawData || rawData.length === 0) {
    return (
      <Box
        flexGrow={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="#fff7f2"
        height="100vh"
      >
        <Typography variant="h6">No file uploaded. Please upload a file first.</Typography>
      </Box>
    );
  }

  const headers = rawData[0];
  const bodyRows = rawData.slice(1);

  const handleSort = (columnIndex: number) => {
    let nextDirection: SortDirection = 'asc';
    if (sortConfig.columnIndex === columnIndex) {
      if (sortConfig.direction === 'asc') nextDirection = 'desc';
      else if (sortConfig.direction === 'desc') nextDirection = null;
    }

    setSortConfig({ columnIndex, direction: nextDirection });

    if (nextDirection === null) {
      setData(rawData);
    } else {
      const sortedBody = [...bodyRows].sort((a, b) => {
        const valA = a[columnIndex] || '';
        const valB = b[columnIndex] || '';
        return nextDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
      setData([headers, ...sortedBody]);
    }
  };

  const handleSubmit = () => {
    console.log('Submitting data:', data);
    alert('Data submitted!');
  };

  return (
    <Box p={4} flexGrow={1} bgcolor="#fff7f2" minHeight="100vh">
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        File Preview
      </Typography>

      <Box sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        <TableContainer component={Paper} sx={{ borderRadius: 2, maxHeight: '70vh' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {headers.map((header, index) => (
                  <TableCell
                    key={index}
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: '#f7c9a6',
                      color: '#000',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSort(index)}
                  >
                    <TableSortLabel
                      active={sortConfig.columnIndex === index}
                      direction={sortConfig.direction ?? 'asc'}
                      hideSortIcon={sortConfig.columnIndex !== index}
                      IconComponent={() => null} // Optional: Hide default icon
                    >
                      {header}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.slice(1).map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <TableCell key={colIndex}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              px: 4,
              py: 1.5,
              fontWeight: 'bold',
              borderRadius: '999px',
              backgroundColor: '#dc6023',
              '&:hover': {
                backgroundColor: '#b5481b',
              },
            }}
          >
            Submit
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default FilePreview;
