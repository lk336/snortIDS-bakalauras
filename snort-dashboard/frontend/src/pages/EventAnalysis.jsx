import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  IconButton, Collapse, TablePagination
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api';

const TABS = [
  { key: 'date', label: 'By Date', endpoint: '/events/analysis/by-date', detailKey: 'date' },
  { key: 'source_ip', label: 'By Source IP', endpoint: '/events/analysis/by-source-ip', detailKey: 'source_ip' },
  { key: 'attack_type', label: 'By Attack Type', endpoint: '/events/analysis/by-attack-type', detailKey: 'attack_type' },
  { key: 'port', label: 'By Port', endpoint: '/events/analysis/by-port', detailKey: 'port' },
];

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7', '#c2185b', '#455a64'];

const getProtocolName = (proto) => ({ 6: 'TCP', 17: 'UDP', 1: 'ICMP' }[proto] || proto);
const getPriorityColor = (p) => (p === 1 ? 'error' : p === 2 ? 'warning' : 'default');

function GroupDetail({ groupBy, groupKey }) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(() => {
    setLoading(true);
    api.get(`/events/analysis/details/${groupBy}/${encodeURIComponent(groupKey)}`, {
      params: { page: page + 1, per_page: perPage }
    }).then(res => {
      setEvents(res.data.events);
      setTotal(res.data.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [groupBy, groupKey, page, perPage]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  if (loading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>;

  return (
    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>Timestamp</TableCell>
              <TableCell>Source IP</TableCell>
              <TableCell>Destination IP</TableCell>
              <TableCell>Ports</TableCell>
              <TableCell>Signature</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Protocol</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((e, i) => (
              <TableRow key={i} hover>
                <TableCell>{e.timestamp ? new Date(e.timestamp).toLocaleString('en-GB') : '-'}</TableCell>
                <TableCell>{e.src_ip || '-'}</TableCell>
                <TableCell>{e.dst_ip || '-'}</TableCell>
                <TableCell>{e.src_port && e.dst_port ? `${e.src_port} → ${e.dst_port}` : '-'}</TableCell>
                <TableCell>{e.signature}</TableCell>
                <TableCell><Chip size="small" label={e.priority || '-'} color={getPriorityColor(e.priority)} /></TableCell>
                <TableCell>{getProtocolName(e.protocol)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {total > perPage && (
        <TablePagination
          component="div" count={total} page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={perPage}
          onRowsPerPageChange={e => { setPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      )}
    </Box>
  );
}

function AnalysisTab({ tabConfig }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    setLoading(true);
    setExpandedRow(null);
    api.get(tabConfig.endpoint)
      .then(res => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tabConfig.endpoint]);

  const toggleRow = (key) => {
    setExpandedRow(prev => (prev === key ? null : key));
  };

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  if (data.length === 0) {
    return <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>No events found</Typography>;
  }

  const chartData = tabConfig.key === 'date'
    ? [...data].sort((a, b) => a.key.localeCompare(b.key))
    : data.slice(0, 20);

  const isDateTab = tabConfig.key === 'date';

  return (
    <Box>
      {/* Chart */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          {tabConfig.label} — {isDateTab ? 'All dates' : `Top ${chartData.length} groups`} ({data.reduce((s, d) => s + d.count, 0)} total events)
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          {isDateTab ? (
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="key" angle={-35} textAnchor="end" height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(v) => `Date: ${v}`} />
              <Line type="monotone" dataKey="count" name="Events" stroke="#1976d2" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="key" angle={-35} textAnchor="end" height={80}
                tick={{ fontSize: 12 }} interval={0}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Events">
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </Paper>

      {/* Expandable table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', width: 50 }} />
              <TableCell sx={{ color: 'white' }}>
                {tabConfig.key === 'date' ? 'Date' :
                 tabConfig.key === 'source_ip' ? 'Source IP Address' :
                 tabConfig.key === 'attack_type' ? 'Attack Type (Signature)' :
                 'Destination Port'}
              </TableCell>
              <TableCell sx={{ color: 'white' }} align="right">Event Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <React.Fragment key={row.key}>
                <TableRow
                  hover sx={{ cursor: 'pointer' }}
                  onClick={() => toggleRow(row.key)}
                >
                  <TableCell>
                    <IconButton size="small">
                      {expandedRow === row.key ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={expandedRow === row.key ? 'bold' : 'normal'}>
                      {row.key}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={row.count} color="primary" variant="outlined" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} sx={{ p: 0, borderBottom: expandedRow === row.key ? undefined : 'none' }}>
                    <Collapse in={expandedRow === row.key} timeout="auto" unmountOnExit>
                      <GroupDetail groupBy={tabConfig.detailKey} groupKey={row.key} />
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function EventAnalysis() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" mb={3}>Event Analysis</Typography>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          {TABS.map((t) => (
            <Tab key={t.key} label={t.label} />
          ))}
        </Tabs>
      </Paper>
      <AnalysisTab tabConfig={TABS[activeTab]} />
    </Box>
  );
}