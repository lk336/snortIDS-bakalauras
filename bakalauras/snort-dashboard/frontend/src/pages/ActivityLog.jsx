import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip
} from '@mui/material';
import api from '../api';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/auth/activity').then(res => setLogs(res.data)).catch(() => {});
  }, []);

  const getActionColor = (action) => {
    if (action === 'LOGIN') return 'success';
    if (action.includes('DELETE')) return 'error';
    if (action.includes('CREATE')) return 'primary';
    if (action.includes('START') || action.includes('STOP')) return 'warning';
    return 'default';
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>Activity Log</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white' }}>Timestamp</TableCell>
              <TableCell sx={{ color: 'white' }}>User</TableCell>
              <TableCell sx={{ color: 'white' }}>Action</TableCell>
              <TableCell sx={{ color: 'white' }}>Details</TableCell>
              <TableCell sx={{ color: 'white' }}>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No records found</TableCell>
              </TableRow>
            ) : logs.map((log, i) => (
              <TableRow key={i} hover>
                <TableCell>{new Date(log.timestamp).toLocaleString('en-GB')}</TableCell>
                <TableCell>{log.username || log.user_id}</TableCell>
                <TableCell>
                  <Chip size="small" label={log.action} color={getActionColor(log.action)} />
                </TableCell>
                <TableCell>{log.details}</TableCell>
                <TableCell>{log.ip_address}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}