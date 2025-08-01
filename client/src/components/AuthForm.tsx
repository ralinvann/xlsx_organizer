import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  InputAdornment,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';

const AuthForm: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleToggle = (_: any, newMode: 'login' | 'signup' | null) => {
    if (newMode) {
      setMode(newMode);
      setFormData({ username: '', email: '', password: '' });
      setErrorMsg('');
      setSuccessMsg('');
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const endpoint =
        mode === 'login'
          ? 'http://localhost:5000/api/auth/login'
          : 'http://localhost:5000/api/auth/signup';

      const body =
        mode === 'signup'
          ? { username: formData.username, email: formData.email, password: formData.password }
          : { email: formData.email, password: formData.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `${mode} failed`);

      localStorage.setItem('token', data.token || '');
      setSuccessMsg(`${mode === 'login' ? 'Logged in' : 'Signed up'} successfully`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        width: '100%',
        maxWidth: 420,
        p: 5,
        borderRadius: 6,
        background: 'linear-gradient(to bottom right, #fff4eb, #ffe3cc)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" fontWeight="bold" color="#3e2c23" gutterBottom>
        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
      </Typography>

      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleToggle}
        fullWidth
        sx={{ my: 3 }}
      >
        <ToggleButton value="login" sx={toggleStyle}>
          Login
        </ToggleButton>
        <ToggleButton value="signup" sx={toggleStyle}>
          Signup
        </ToggleButton>
      </ToggleButtonGroup>

      {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

      {mode === 'signup' && (
        <TextField
          fullWidth
          variant="outlined"
          label="Username"
          value={formData.username}
          onChange={handleChange('username')}
          sx={inputStyle}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon sx={{ color: '#9e5b31' }} />
              </InputAdornment>
            ),
          }}
          InputLabelProps={{ sx: { color: '#9e5b31' } }}
        />
      )}

      <TextField
        fullWidth
        variant="outlined"
        label="Email"
        value={formData.email}
        onChange={handleChange('email')}
        sx={inputStyle}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon sx={{ color: '#9e5b31' }} />
            </InputAdornment>
          ),
        }}
        InputLabelProps={{ sx: { color: '#9e5b31' } }}
      />

      <TextField
        fullWidth
        variant="outlined"
        label="Password"
        type="password"
        value={formData.password}
        onChange={handleChange('password')}
        sx={inputStyle}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon sx={{ color: '#9e5b31' }} />
            </InputAdornment>
          ),
        }}
        InputLabelProps={{ sx: { color: '#9e5b31' } }}
      />

      <Button
        variant="contained"
        fullWidth
        onClick={handleSubmit}
        sx={{
          py: 1.5,
          mt: 2,
          borderRadius: '999px',
          fontWeight: 'bold',
          fontSize: '1rem',
          backgroundColor: '#dc6023',
          transition: '0.3s ease-in-out',
          '&:hover': {
            backgroundColor: '#b5481b',
            transform: 'scale(1.03)',
          },
        }}
      >
        {mode === 'login' ? 'Login' : 'Signup'}
      </Button>
    </Paper>
  );
};

// 🔸 Input style
const inputStyle = {
  mb: 2,
  input: {
    color: '#3e2c23',
    backgroundColor: '#fff6f1',
    borderRadius: '12px',
    paddingY: 1.5,
    paddingX: 2,
  },
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    '& fieldset': {
      border: '1px solid #dc6023',
    },
    '&:hover fieldset': {
      borderColor: '#b5481b',
    },
  },
};

// 🔸 Toggle button style
const toggleStyle = {
  textTransform: 'none',
  fontWeight: 'bold',
  fontSize: '1rem',
  color: '#3e2c23',
  '&.Mui-selected': {
    backgroundColor: '#dc6023',
    color: '#fff6f1',
    '&:hover': { backgroundColor: '#b5481b' },
  },
};

export default AuthForm;
