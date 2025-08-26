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
  const rawData: Record<string, string>[] = location.state?.data || [];

  const [sortConfig, setSortConfig] = useState<{
    columnKey: string | null;
    direction: SortDirection;
  }>({ columnKey: null, direction: null });

  const [data, setData] = useState<Record<string, string>[]>(rawData);

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

  const headers = Object.keys(rawData[0]);

  const handleSort = (columnKey: string) => {
    let nextDirection: SortDirection = 'asc';
    if (sortConfig.columnKey === columnKey) {
      if (sortConfig.direction === 'asc') nextDirection = 'desc';
      else if (sortConfig.direction === 'desc') nextDirection = null;
    }

    setSortConfig({ columnKey, direction: nextDirection });

    if (nextDirection === null) {
      setData(rawData);
    } else {
      const sorted = [...data].sort((a, b) => {
        const valA = a[columnKey] || '';
        const valB = b[columnKey] || '';
        return nextDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
      setData(sorted);
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
                {headers.map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: '#f7c9a6',
                      color: '#000',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSort(header)}
                  >
                    <TableSortLabel
                      active={sortConfig.columnKey === header}
                      direction={sortConfig.direction ?? 'asc'}
                      hideSortIcon={sortConfig.columnKey !== header}
                      IconComponent={() => null}
                    >
                      {header}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((header, colIndex) => (
                    <TableCell key={colIndex}>{row[header]}</TableCell>
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
