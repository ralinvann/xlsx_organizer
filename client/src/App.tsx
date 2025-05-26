import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import FileUpload from './pages/FileUpload';
import FilePreview from './pages/FilePreview';
import Header from './components/Header';
import Footer from './components/Footer';
import { Box } from '@mui/material';

const App: React.FC = () => {
  return (
    <Router>
      <Box display="flex" flexDirection="column" minHeight="100vh" bgcolor="#fff7f2">
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
