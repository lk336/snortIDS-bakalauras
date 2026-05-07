import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, TextField, TablePagination,
  Chip, Grid, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select,
  Tooltip, List, ListItemText, ListItemButton, Divider
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import api from '../api';

const COLUMNS = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'src_ip', label: 'Source IP' },
  { key: 'dst_ip', label: 'Destination IP' },
  { key: 'port', label: 'Ports' },
  { key: 'signature', label: 'Signature' },
  { key: 'priority', label: 'Priority' },
  { key: 'protocol', label: 'Protocol', noSort: true },
];

const emptyFilters = { src_ip: '', dst_ip: '', sig_name: '', protocol: '', port: '', date_from: '', date_to: '' };

export default function Events() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [filters, setFilters] = useState(emptyFilters);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  const [savedFilters, setSavedFilters] = useState([]);
  const [chooseFilterOpen, setChooseFilterOpen] = useState(false);
  const [createFilterOpen, setCreateFilterOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterForm, setNewFilterForm] = useState(emptyFilters);

  const fetchEvents = (overrideFilters, overrideSort, overrideSortDir) => {
    const f = overrideFilters !== undefined ? overrideFilters : filters;
    const s = overrideSort || sortBy;
    const d = overrideSortDir || sortDir;
    const params = { page: page + 1, per_page: perPage, sort_by: s, sort_dir: d };
    if (f.src_ip) params.src_ip = f.src_ip;
    if (f.dst_ip) params.dst_ip = f.dst_ip;
    if (f.sig_name) params.sig_name = f.sig_name;
    if (f.protocol) params.protocol = f.protocol;
    if (f.port) params.port = f.port;
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;
    api.get('/events/', { params }).then(res => {
      setEvents(res.data.events);
      setTotal(res.data.total);
    }).catch(() => {});
  };

  const fetchSavedFilters = () => {
    api.get('/events/filters').then(res => setSavedFilters(res.data)).catch(() => {});
  };

  useEffect(() => { fetchEvents(); }, [page, perPage]);
  useEffect(() => { fetchSavedFilters(); }, []);

  const handleSearch = () => { setPage(0); fetchEvents(); };

  const handleClear = () => {
    setFilters(emptyFilters);
    setSortBy('timestamp');
    setSortDir('desc');
    setPage(0);
    fetchEvents(emptyFilters, 'timestamp', 'desc');
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      const newDir = sortDir === 'desc' ? 'asc' : 'desc';
      setSortDir(newDir);
      fetchEvents(undefined, col, newDir);
    } else {
      setSortBy(col);
      setSortDir('desc');
      fetchEvents(undefined, col, 'desc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <UnfoldMoreIcon sx={{ fontSize: 16, opacity: 0.5 }} />;
    return sortDir === 'desc'
      ? <ArrowDownwardIcon sx={{ fontSize: 16 }} />
      : <ArrowUpwardIcon sx={{ fontSize: 16 }} />;
  };

  const handleLoadFilter = (filter) => {
    setFilters(filter.filter_config);
    setChooseFilterOpen(false);
    setPage(0);
    fetchEvents(filter.filter_config);
  };

  const handleCreateFilter = async () => {
    if (!newFilterName.trim()) return;
    await api.post('/events/filters', { name: newFilterName, filter_config: newFilterForm });
    setCreateFilterOpen(false);
    setNewFilterName('');
    setNewFilterForm(emptyFilters);
    fetchSavedFilters();
  };

  const getProtocolName = (proto) => ({ 6: 'TCP', 17: 'UDP', 1: 'ICMP' }[proto] || proto);
  const getPriorityColor = (p) => p === 1 ? 'error' : p === 2 ? 'warning' : 'default';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Events</Typography>
        <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setChooseFilterOpen(true)}>
          Choose Filter
        </Button>
      </Box>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" label="Source IP"
              value={filters.src_ip} onChange={e => setFilters({ ...filters, src_ip: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" label="Destination IP"
              value={filters.dst_ip} onChange={e => setFilters({ ...filters, dst_ip: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" label="Signature"
              value={filters.sig_name} onChange={e => setFilters({ ...filters, sig_name: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3} md={1}>
            <TextField fullWidth size="small" label="Port"
              value={filters.port} onChange={e => setFilters({ ...filters, port: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Select fullWidth size="small" displayEmpty
              value={filters.protocol}
              onChange={e => setFilters({ ...filters, protocol: e.target.value })}>
              <MenuItem value="">All protocols</MenuItem>
              <MenuItem value="6">TCP</MenuItem>
              <MenuItem value="17">UDP</MenuItem>
              <MenuItem value="1">ICMP</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" label="Date from" type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.date_from}
              onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" label="Date to" type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.date_to}
              onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Box display="flex" gap={1}>
              <Button variant="contained" onClick={handleSearch}>Search</Button>
              <Button variant="outlined" onClick={handleClear}>Clear</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Events table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {COLUMNS.map(col => (
                <TableCell key={col.key}
                  sx={{ color: 'white', cursor: col.noSort ? 'default' : 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => !col.noSort && handleSort(col.key)}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {col.label}
                    {!col.noSort && <SortIcon col={col.key} />}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {events.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No events found</TableCell></TableRow>
            ) : events.map((event, i) => (
              <TableRow key={i} hover>
                <TableCell>{event.timestamp ? new Date(event.timestamp).toLocaleString('en-GB') : '-'}</TableCell>
                <TableCell>{event.src_ip || '-'}</TableCell>
                <TableCell>{event.dst_ip || '-'}</TableCell>
                <TableCell>{event.src_port && event.dst_port ? `${event.src_port} → ${event.dst_port}` : '-'}</TableCell>
                <TableCell>{event.signature}</TableCell>
                <TableCell><Chip size="small" label={event.priority || '-'} color={getPriorityColor(event.priority)} /></TableCell>
                <TableCell>{getProtocolName(event.protocol)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page}
          onPageChange={(e, p) => setPage(p)}
          rowsPerPage={perPage}
          onRowsPerPageChange={e => { setPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="Rows:" />
      </TableContainer>

      {/* Choose Filter dialog */}
      <Dialog open={chooseFilterOpen} onClose={() => setChooseFilterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Saved Filters</DialogTitle>
        <DialogContent>
          {savedFilters.length === 0
            ? <Typography color="text.secondary" sx={{ py: 2 }}>No saved filters yet.</Typography>
            : <List dense>
                {savedFilters.map(f => (
                  <React.Fragment key={f.id}>
                    <ListItemButton onClick={() => handleLoadFilter(f)}>
                      <ListItemText primary={f.name}
                        secondary={Object.entries(f.filter_config).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' | ') || 'No filters set'} />
                    </ListItemButton>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChooseFilterOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => { setChooseFilterOpen(false); setCreateFilterOpen(true); }}>
            + Create New
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Filter dialog */}
      <Dialog open={createFilterOpen} onClose={() => setCreateFilterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Filter</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Filter name" value={newFilterName}
            onChange={e => setNewFilterName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Source IP"
                value={newFilterForm.src_ip}
                onChange={e => setNewFilterForm({ ...newFilterForm, src_ip: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Destination IP"
                value={newFilterForm.dst_ip}
                onChange={e => setNewFilterForm({ ...newFilterForm, dst_ip: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Signature"
                value={newFilterForm.sig_name}
                onChange={e => setNewFilterForm({ ...newFilterForm, sig_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Port"
                value={newFilterForm.port}
                onChange={e => setNewFilterForm({ ...newFilterForm, port: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <Select fullWidth size="small" displayEmpty
                value={newFilterForm.protocol}
                onChange={e => setNewFilterForm({ ...newFilterForm, protocol: e.target.value })}>
                <MenuItem value="">All protocols</MenuItem>
                <MenuItem value="6">TCP</MenuItem>
                <MenuItem value="17">UDP</MenuItem>
                <MenuItem value="1">ICMP</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date from" type="date"
                InputLabelProps={{ shrink: true }}
                value={newFilterForm.date_from}
                onChange={e => setNewFilterForm({ ...newFilterForm, date_from: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date to" type="date"
                InputLabelProps={{ shrink: true }}
                value={newFilterForm.date_to}
                onChange={e => setNewFilterForm({ ...newFilterForm, date_to: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFilterOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFilter}>Save Filter</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}