import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, TextField, TablePagination,
  Chip, Grid, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select,
  Tooltip, IconButton, List, ListItemText, ListItemButton, Divider
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
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
  const [groupBy, setGroupBy] = useState('none');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  const [ruleInfo, setRuleInfo] = useState(null);

  const handleShowRule = async (sigSid) => {
    if (!sigSid) return;
    try {
      const res = await api.get(`/rules/by-sid/${sigSid}`);
      setRuleInfo(res.data);
    } catch {
      setRuleInfo({ error: `No rule found for SID ${sigSid}` });
    }
  };

  const handleDelete = async (sid, cid) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${sid}/${cid}`);
      fetchEvents();
    } catch {}
  };

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

  const groupedEvents = useMemo(() => {
    if (groupBy === 'none') return { '': events };
    const groups = {};
    events.forEach(e => {
      let key;
      if (groupBy === 'src_ip') key = e.src_ip || 'Unknown';
      else if (groupBy === 'dst_ip') key = e.dst_ip || 'Unknown';
      else if (groupBy === 'signature') key = e.signature || 'Unknown';
      else if (groupBy === 'protocol') key = getProtocolName(e.protocol);
      else if (groupBy === 'date') key = e.timestamp ? new Date(e.timestamp).toLocaleDateString('en-GB') : 'Unknown';
      else key = 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [events, groupBy]);

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
          <Grid item xs={6} sm={3} md={2}>
            <Select fullWidth size="small" displayEmpty value={groupBy}
              onChange={e => { setGroupBy(e.target.value); setCollapsedGroups({}); }}>
              <MenuItem value="none"><em>No grouping</em></MenuItem>
              <MenuItem value="src_ip">Source IP</MenuItem>
              <MenuItem value="dst_ip">Destination IP</MenuItem>
              <MenuItem value="signature">Signature</MenuItem>
              <MenuItem value="protocol">Protocol</MenuItem>
              <MenuItem value="date">Date</MenuItem>
            </Select>
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
              {isAdmin && <TableCell sx={{ color: 'white' }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {events.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 8 : 7} align="center">No events found</TableCell></TableRow>
            ) : Object.entries(groupedEvents).map(([groupName, groupEvents]) => (
              <React.Fragment key={groupName}>
                {groupBy !== 'none' && (
                  <TableRow sx={{ bgcolor: 'grey.100', cursor: 'pointer' }}
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}>
                    <TableCell colSpan={isAdmin ? 8 : 7} sx={{ fontWeight: 'bold' }}>
                      {collapsedGroups[groupName] ? '▶' : '▼'} {groupName} ({groupEvents.length})
                    </TableCell>
                  </TableRow>
                )}
                {!collapsedGroups[groupName] && groupEvents.map((event, i) => (
                  <TableRow key={`${groupName}-${i}`} hover>
                    <TableCell>{event.timestamp ? new Date(event.timestamp).toLocaleString('en-GB') : '-'}</TableCell>
                    <TableCell>{event.src_ip || '-'}</TableCell>
                    <TableCell>{event.dst_ip || '-'}</TableCell>
                    <TableCell>{event.src_port && event.dst_port ? `${event.src_port} → ${event.dst_port}` : '-'}</TableCell>
                    <TableCell>{event.signature}</TableCell>
                    <TableCell><Chip size="small" label={event.priority || '-'} color={getPriorityColor(event.priority)} /></TableCell>
                    <TableCell>{getProtocolName(event.protocol)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <IconButton size="small" color="info" onClick={() => handleShowRule(event.sig_sid)}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(event.sid, event.cid)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </React.Fragment>
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

      <Dialog open={!!ruleInfo} onClose={() => setRuleInfo(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Triggered Rule</DialogTitle>
        <DialogContent>
          {ruleInfo?.error ? (
            <Typography color="text.secondary">{ruleInfo.error}</Typography>
          ) : ruleInfo && (
            <Box>
              <Typography variant="body2"><b>SID:</b> {ruleInfo.sid}</Typography>
              <Typography variant="body2"><b>Description:</b> {ruleInfo.description || '-'}</Typography>
              <Typography variant="body2"><b>Category:</b> {ruleInfo.category || '-'}</Typography>
              <Typography variant="body2"><b>Enabled:</b> {ruleInfo.is_enabled ? 'Yes' : 'No'}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}><b>Rule text:</b></Typography>
              <Box sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', mt: 0.5 }}>
                {ruleInfo.rule_text}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleInfo(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}