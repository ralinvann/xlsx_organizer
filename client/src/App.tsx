import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, CssBaseline, GlobalStyles } from '@mui/material';

import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import FileUpload from './pages/FileUpload';
import FilePreview from './pages/FilePreview';
import Header from './components/Header';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <Router>
      {/* Reset and global overrides */}
      <CssBaseline />
      <GlobalStyles
        styles={{
          '*': {
            boxSizing: 'border-box',
          },
          '*:focus': {
            outline: 'none',
          },
          'html, body, #root': {
            height: '100%',
            margin: 0,
            padding: 0,
            fontFamily: 'Roboto, sans-serif',
            background: 'linear-gradient(to bottom, #fff7f2, #ffe2ca)',
          },
        }}
      />

      {/* App container */}
      <Box
        display="flex"
        flexDirection="column"
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(to bottom, #fff7f2, #ffe2ca)',
          overflowX: 'hidden',
        }}
      >
        <Header />
        <Box flexGrow={1}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/preview" element={<FilePreview />} />
          </Routes>
        </Box>
        <Footer />
      </Box>
    </Router>
  );
};

export default App;
