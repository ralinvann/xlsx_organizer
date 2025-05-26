import React, { useState, DragEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Container,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

import USFlag from '../assets/flags/us.svg';
import IDFlag from '../assets/flags/id.svg';

const instructions = {
  en: [
    'Make sure the file is in .xlsx, .xls, or .csv format.',
    'Use the official template provided by the health department.',
    'Each row must contain one elderly person’s data.',
    'Do not leave important columns empty (like name, village, blood pressure).',
    'Only upload clean and verified data.',
    'Click "Browse File" or drag and drop your file into the box above.',
  ],
  id: [
    'Pastikan file berformat .xlsx, .xls, atau .csv.',
    'Gunakan template resmi dari dinas kesehatan.',
    'Setiap baris harus berisi data satu lansia.',
    'Jangan biarkan kolom penting kosong (seperti nama, desa, tekanan darah).',
    'Hanya unggah data yang sudah bersih dan terverifikasi.',
    'Klik "Browse File" atau tarik dan lepas file ke kotak di atas.',
  ],
};

const FileUpload: React.FC = () => {
  const [dragOver, setDragOver] = useState(false);
  const [lang, setLang] = useState<'en' | 'id'>('en');
  const navigate = useNavigate();

  const toggleLang = () => setLang((prev) => (prev === 'en' ? 'id' : 'en'));

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      navigate('/preview', { state: { data: json } });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh" bgcolor="#fff7f2">
      <Container maxWidth={false} sx={{ width: '80%', p: 4, flexGrow: 1 }}>
        {/* Upload Section */}
        <Paper
          elevation={3}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 3,
            backgroundColor: '#dc6023',
            border: dragOver ? '3px dashed #000' : '3px dashed transparent',
            transition: 'border 0.3s ease-in-out',
          }}
        >
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Upload Document
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Drag and Drop or Upload File
          </Typography>
          <UploadFileIcon sx={{ fontSize: 64 }} />
          <Box mt={2}>
            <Button variant="contained" component="label">
              Browse File
              <input type="file" hidden onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
            </Button>
          </Box>
        </Paper>

        {/* Instructions Section */}
        <Paper
          elevation={3}
          sx={{
            mt: 4,
            p: 4,
            borderRadius: 3,
            backgroundColor: '#f7c9a6',
            position: 'relative',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              {lang === 'en' ? 'Instructions' : 'Petunjuk'}
            </Typography>

            {/* Flag Toggle */}
            <Box
              onClick={toggleLang}
              sx={{
                width: 60,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#e0e0e0',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                px: '4px',
                userSelect: 'none',
              }}
            >
              <Box
                component="img"
                src={IDFlag}
                alt="ID"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  filter: lang === 'id' ? 'none' : 'grayscale(100%) brightness(0.8)',
                }}
              />
              <Box
                component="img"
                src={USFlag}
                alt="EN"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  filter: lang === 'en' ? 'none' : 'grayscale(100%) brightness(0.8)',
                }}
              />
            </Box>
          </Box>

          <List>
            {instructions[lang].map((text, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      bgcolor: '#000',
                      borderRadius: '50%',
                      mt: '6px',
                    }}
                  />
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  );
};

export default FileUpload;
