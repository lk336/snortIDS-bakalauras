import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, running: false });

  useEffect(() => {
    api.get('/events/?per_page=1').then(res => {
      setStats(prev => ({ ...prev, total: res.data.total }));
    }).catch(() => {});
    api.get('/server/status').then(res => {
      setStats(prev => ({ ...prev, running: res.data.running }));
    }).catch(() => {});
  }, []);

  return (
    <Box>
      <Typography variant="h4" mb={3}>Dashboard</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Snort Status</Typography>
            <Typography variant="h4" color={stats.running ? 'success.main' : 'error.main'}>
              {stats.running ? '🟢 Running' : '🔴 Stopped'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Total Events</Typography>
            <Typography variant="h4">{stats.total}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Role</Typography>
            <Typography variant="h4">{localStorage.getItem('role')}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}