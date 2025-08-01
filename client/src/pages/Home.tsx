import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, } from '@mui/material';
import AuthForm from '../components/AuthForm'; 

const TYPING_TEXT = `Our platform helps healthcare workers collect, analyze, and visualize elderly care data from villages across the region. Upload health reports, monitor critical conditions, and ensure timely interventions — all in one place.`;

const Home: React.FC = () => {
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText((prev) => prev + TYPING_TEXT[i]);
      i++;
      if (i >= TYPING_TEXT.length) clearInterval(interval);
    }, 20); // speed of typing
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      display="flex"
      minHeight="100vh"
      sx={{
        background: 'linear-gradient(to bottom, #fff7f2, #ffe2ca)',
      }}
    >
      {/* Left Side */}
      <Box
        flex={7}
        display="flex"
        flexDirection="column"
        justifyContent="center"
        px={8}
        py={6}
        bgcolor="transparent"
      >
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Welcome to ElderCare Data Network
        </Typography>

        <Typography variant="h6" color="text.secondary" maxWidth="80%" mb={4}>
          {typedText}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          href="/dashboard"
          sx={{
            width: 200,
            py: 1.5,
            borderRadius: '999px',
            backgroundColor: '#dc6023',
            '&:hover': { backgroundColor: '#b5481b' },
          }}
        >
          Explore Dashboard
        </Button>
      </Box>

      {/* Right Side: Login */}
      <Box
        flex={3}
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="transparent"
      >
        <AuthForm />
      </Box>
    </Box>
  );
};

export default Home;
