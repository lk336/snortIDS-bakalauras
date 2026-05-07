import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Alert, CircularProgress
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import api from '../api';

export default function ServerControl() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const role = localStorage.getItem('role');

  const fetchStatus = () => {
    api.get('/server/status').then(res => setRunning(res.data.running)).catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await api.post('/server/start');
      setMessage(res.data.message);
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      setMessage('Error starting Snort');
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await api.post('/server/stop');
      setMessage(res.data.message);
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      setMessage('Error stopping Snort');
    }
    setLoading(false);
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>Server Control</Typography>

      {role !== 'admin' && (
        <Alert severity="warning" sx={{ mb: 2 }}>Only administrators can control the server</Alert>
      )}

      {message && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, mx: 'auto' }}>
        <Typography variant="h6" mb={2}>Snort IDS Status</Typography>
        <Chip
          label={running ? 'Running' : 'Stopped'}
          color={running ? 'success' : 'error'}
          sx={{ fontSize: 18, p: 2, mb: 4 }}
        />
        <Box display="flex" justifyContent="center" gap={2}>
          <Button
            variant="contained" color="success" size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            onClick={handleStart} disabled={running || loading || role !== 'admin'}
          >
            Start
          </Button>
          <Button
            variant="contained" color="error" size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <StopIcon />}
            onClick={handleStop} disabled={!running || loading || role !== 'admin'}
          >
            Stop
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}