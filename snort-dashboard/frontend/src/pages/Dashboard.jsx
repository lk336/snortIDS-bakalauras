import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, running: false });
  const [topSources, setTopSources] = useState([]);

  useEffect(() => {
    api.get('/events/?per_page=1').then(res => {
      setStats(prev => ({ ...prev, total: res.data.total }));
    }).catch(() => {});

    api.get('/server/status').then(res => {
      setStats(prev => ({ ...prev, running: res.data.running }));
    }).catch(() => {});

    api.get('/events/analysis/by-source-ip').then(res => {
      setTopSources(res.data.slice(0, 5));
    }).catch(() => {});
  }, []);

  return (
    <Box>
      <Typography variant="h4" mb={3}>Dashboard</Typography>

      {/* Status cards */}
      <Grid container spacing={3} mb={3}>
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

      {/* Top 5 source IPs */}
      {topSources.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" mb={2}>Top 5 Source IP Addresses</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white' }}>#</TableCell>
                  <TableCell sx={{ color: 'white' }}>Source IP</TableCell>
                  <TableCell sx={{ color: 'white' }} align="right">Events</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topSources.map((row, i) => (
                  <TableRow key={row.key} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{row.key}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" label={row.count} color={i === 0 ? 'error' : i < 3 ? 'warning' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}