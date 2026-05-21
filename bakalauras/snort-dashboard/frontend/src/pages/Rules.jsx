import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Switch, Chip,
  IconButton, Alert, Grid, Select, MenuItem, Tabs, Tab,
  Divider, CircularProgress, InputLabel, FormControl
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../api';

const ACTIONS = ['alert', 'log', 'pass', 'drop', 'reject'];
const PROTOCOLS = ['tcp', 'udp', 'icmp', 'ip'];
const DIRECTIONS = ['->', '<>'];
const CLASSTYPES = [
  '', 'attempted-admin', 'attempted-user', 'web-application-attack',
  'trojan-activity', 'network-scan', 'denial-of-service', 'policy-violation',
];

const emptyUiForm = {
  action: 'alert', proto: 'tcp',
  src_ip: 'any', src_port: 'any',
  direction: '->',
  dst_ip: 'any', dst_port: 'any',
  msg: '', sid: '', rev: '1',
  content: '', classtype: '', priority: '',
};

function buildRuleText(f) {
  let opts = '';
  if (f.msg) opts += `msg:"${f.msg}"; `;
  if (f.content) opts += `content:"${f.content}"; `;
  if (f.classtype) opts += `classtype:${f.classtype}; `;
  if (f.priority) opts += `priority:${f.priority}; `;
  if (f.sid) opts += `sid:${f.sid}; `;
  opts += `rev:${f.rev || 1};`;
  return `${f.action} ${f.proto} ${f.src_ip} ${f.src_port} ${f.direction} ${f.dst_ip} ${f.dst_port} (${opts})`;
}

function parseRuleText(text) {
  const form = { ...emptyUiForm };
  try {
    const headerMatch = text.match(/^(\w+)\s+(\w+)\s+(\S+)\s+(\S+)\s+(->|<>)\s+(\S+)\s+(\S+)\s+\((.+)\)\s*$/s);
    if (!headerMatch) return null;
    form.action = headerMatch[1] || 'alert';
    form.proto = headerMatch[2] || 'tcp';
    form.src_ip = headerMatch[3] || 'any';
    form.src_port = headerMatch[4] || 'any';
    form.direction = headerMatch[5] || '->';
    form.dst_ip = headerMatch[6] || 'any';
    form.dst_port = headerMatch[7] || 'any';
    const optsStr = headerMatch[8];
    const msgMatch = optsStr.match(/msg\s*:\s*"([^"]*)"/);
    if (msgMatch) form.msg = msgMatch[1];
    const contentMatch = optsStr.match(/content\s*:\s*"([^"]*)"/);
    if (contentMatch) form.content = contentMatch[1];
    const classMatch = optsStr.match(/classtype\s*:\s*([^;]+)/);
    if (classMatch) form.classtype = classMatch[1].trim();
    const prioMatch = optsStr.match(/priority\s*:\s*(\d+)/);
    if (prioMatch) form.priority = prioMatch[1];
    const sidMatch = optsStr.match(/sid\s*:\s*(\d+)/);
    if (sidMatch) form.sid = sidMatch[1];
    const revMatch = optsStr.match(/rev\s*:\s*(\d+)/);
    if (revMatch) form.rev = revMatch[1];
  } catch {
    return null;
  }
  return form;
}

function UiFormMode({ uiForm, setUiForm, previewText, onPreviewEdit }) {
  const set = (key) => (e) => setUiForm(prev => ({ ...prev, [key]: e.target.value }));
  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Action</InputLabel>
            <Select value={uiForm.action} label="Action" onChange={set('action')}>
              {ACTIONS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Protocol</InputLabel>
            <Select value={uiForm.proto} label="Protocol" onChange={set('proto')}>
              {PROTOCOLS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Direction</InputLabel>
            <Select value={uiForm.direction} label="Direction" onChange={set('direction')}>
              {DIRECTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={3}>
          <TextField fullWidth size="small" label="Source IP" value={uiForm.src_ip}
            onChange={set('src_ip')} placeholder="any" />
        </Grid>
        <Grid item xs={2}>
          <TextField fullWidth size="small" label="Src Port" value={uiForm.src_port}
            onChange={set('src_port')} placeholder="any" />
        </Grid>
        <Grid item xs={2} display="flex" alignItems="center" justifyContent="center">
          <Typography variant="h6" color="text.secondary">{uiForm.direction}</Typography>
        </Grid>
        <Grid item xs={3}>
          <TextField fullWidth size="small" label="Destination IP" value={uiForm.dst_ip}
            onChange={set('dst_ip')} placeholder="any" />
        </Grid>
        <Grid item xs={2}>
          <TextField fullWidth size="small" label="Dst Port" value={uiForm.dst_port}
            onChange={set('dst_port')} placeholder="any" />
        </Grid>
        <Grid item xs={12}><Divider><Typography variant="caption">Rule options</Typography></Divider></Grid>
        <Grid item xs={6}>
          <TextField fullWidth size="small" label='msg (alert message)' value={uiForm.msg}
            onChange={set('msg')} placeholder='HTTP traffic detected' />
        </Grid>
        <Grid item xs={3}>
          <TextField fullWidth size="small" label="content (optional)" value={uiForm.content}
            onChange={set('content')} placeholder='"/admin"' />
        </Grid>
        <Grid item xs={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Classtype</InputLabel>
            <Select value={uiForm.classtype} label="Classtype" onChange={set('classtype')}>
              {CLASSTYPES.map(c => <MenuItem key={c} value={c}>{c || '(none)'}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={3}>
          <TextField fullWidth size="small" label="Priority" type="number"
            value={uiForm.priority} onChange={set('priority')} placeholder="1-3" />
        </Grid>
        <Grid item xs={4}>
          <TextField fullWidth size="small" label="SID" type="number"
            value={uiForm.sid} onChange={set('sid')} placeholder="1000001" />
        </Grid>
        <Grid item xs={2}>
          <TextField fullWidth size="small" label="Rev" type="number"
            value={uiForm.rev} onChange={set('rev')} />
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }}><Typography variant="caption">Generated rule preview</Typography></Divider>
      <TextField fullWidth multiline rows={2}
        value={previewText}
        onChange={e => onPreviewEdit(e.target.value)}
        sx={{ fontFamily: 'monospace', fontSize: 13 }}
        helperText="You can edit the rule text directly. Changes will update the form fields above."
      />
    </Box>
  );
}

function AiMode({ aiPrompt, setAiPrompt, aiResult, setAiResult, aiLoading, onGenerate }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Describe the rule you want to create in plain language. AI will generate the Snort rule.
      </Typography>
      <TextField
        fullWidth multiline rows={3} label="Describe the rule"
        value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
        placeholder="Block all TCP traffic from 192.168.1.0/24 to port 22 (SSH)"
        sx={{ mb: 2 }}
      />
      <Button variant="outlined" onClick={onGenerate} disabled={aiLoading || !aiPrompt.trim()}>
        {aiLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
        Generate Rule
      </Button>
      {aiResult && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">Generated rule:</Typography>
          <TextField fullWidth multiline rows={2} value={aiResult}
            onChange={e => setAiResult(e.target.value)}
            sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: 13 }} />
          <Button size="small" sx={{ mt: 1 }} onClick={() => setAiResult('')}>Clear</Button>
        </Box>
      )}
    </Box>
  );
}

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [createMode, setCreateMode] = useState(0);
  const [form, setForm] = useState({ sid: '', rule_text: '', description: '', category: '' });
  const [uiForm, setUiForm] = useState(emptyUiForm);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('');
  const [groupBy, setGroupBy] = useState('none');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  const fetchRules = () => {
    api.get('/rules/').then(res => setRules(res.data)).catch(() => {});
  };
  useEffect(() => { fetchRules(); }, []);

  const categories = useMemo(() => {
    const cats = rules.map(r => r.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [rules]);

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      if (searchText) {
        const s = searchText.toLowerCase();
        const match = (r.description || '').toLowerCase().includes(s)
          || (r.rule_text || '').toLowerCase().includes(s)
          || String(r.sid || '').includes(s);
        if (!match) return false;
      }
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterEnabled === 'enabled' && !r.is_enabled) return false;
      if (filterEnabled === 'disabled' && r.is_enabled) return false;
      return true;
    });
  }, [rules, searchText, filterCategory, filterEnabled]);

  const groupedRules = useMemo(() => {
    if (groupBy === 'none') return { '': filteredRules };
    if (groupBy === 'category') {
      const groups = {};
      filteredRules.forEach(r => {
        const key = r.category || 'Uncategorized';
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });
      return groups;
    }
    if (groupBy === 'status') {
      return {
        'Enabled': filteredRules.filter(r => r.is_enabled),
        'Disabled': filteredRules.filter(r => !r.is_enabled),
      };
    }
    return { '': filteredRules };
  }, [filteredRules, groupBy]);

  const toggleGroup = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const handleOpen = (rule = null) => {
    setEditRule(rule);
    setCreateMode(0);
    setForm(rule
      ? { sid: rule.sid, rule_text: rule.rule_text, description: rule.description || '', category: rule.category || '' }
      : { sid: '', rule_text: '', description: '', category: '' });
    setUiForm(emptyUiForm);
    setAiPrompt('');
    setAiResult('');
    setError('');
    setDialogOpen(true);
  };

  const previewText = useMemo(() => buildRuleText(uiForm), [uiForm]);

  const handlePreviewEdit = (text) => {
    const parsed = parseRuleText(text);
    if (parsed) {
      setUiForm(parsed);
    }
  };

  const getActiveRuleText = () => {
    if (createMode === 0) return form.rule_text;
    if (createMode === 1) return buildRuleText(uiForm);
    if (createMode === 2) return aiResult;
    return '';
  };

  const getActiveSid = () => {
    if (createMode === 1) return uiForm.sid;
    return form.sid;
  };

  const handleSave = async () => {
    const rule_text = getActiveRuleText();
    if (!rule_text.trim()) { setError('Rule text is required'); return; }
    const payload = {
      sid: getActiveSid() || form.sid,
      rule_text,
      description: form.description,
      category: form.category,
    };
    try {
      if (editRule) {
        await api.put(`/rules/${editRule.id}`, payload);
      } else {
        await api.post('/rules/', payload);
      }
      setDialogOpen(false);
      fetchRules();
    } catch (err) {
      const msg = err.response?.data?.error || 'Error saving rule';
      setError(msg);
    }
  };

  const handleToggle = async (rule) => {
    await api.put(`/rules/${rule.id}`, { is_enabled: !rule.is_enabled });
    fetchRules();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      await api.delete(`/rules/${id}`);
      fetchRules();
    }
  };

  const handleAiGenerate = async () => {
    setAiLoading(true);
    setError('');
    try {
      const res = await api.post('/rules/ai-generate', { prompt: aiPrompt });
      setAiResult(res.data.rule_text);
    } catch {
      setError('AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const colSpan = isAdmin ? 6 : 5;

  const RuleRow = ({ rule }) => (
    <TableRow key={rule.id} hover>
      <TableCell>{rule.sid}</TableCell>
      <TableCell>{rule.description || '-'}</TableCell>
      <TableCell>{rule.category ? <Chip size="small" label={rule.category} /> : '-'}</TableCell>
      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <code>{rule.rule_text}</code>
      </TableCell>
      <TableCell>
        <Switch checked={rule.is_enabled} onChange={() => isAdmin && handleToggle(rule)}
          size="small" disabled={!isAdmin} />
      </TableCell>
      {isAdmin && (
        <TableCell>
          <IconButton size="small" onClick={() => handleOpen(rule)}><EditIcon /></IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}><DeleteIcon /></IconButton>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Rules</Typography>
        {isAdmin && <Button variant="contained" onClick={() => handleOpen()}>+ New Rule</Button>}
      </Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" label="Search SID / description / rule"
              value={searchText} onChange={e => setSearchText(e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Select fullWidth size="small" displayEmpty value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}>
              <MenuItem value=""><em>All categories</em></MenuItem>
              {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Select fullWidth size="small" displayEmpty value={filterEnabled}
              onChange={e => setFilterEnabled(e.target.value)}>
              <MenuItem value=""><em>All statuses</em></MenuItem>
              <MenuItem value="enabled">Enabled</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Select fullWidth size="small" displayEmpty value={groupBy}
              onChange={e => { setGroupBy(e.target.value); setCollapsedGroups({}); }}>
              <MenuItem value="none"><em>No grouping</em></MenuItem>
              <MenuItem value="category">Group by Category</MenuItem>
              <MenuItem value="status">Group by Status</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Button variant="outlined" onClick={() => {
              setSearchText(''); setFilterCategory(''); setFilterEnabled(''); setGroupBy('none');
            }}>Clear</Button>
          </Grid>
          <Grid item xs={6} sm={3} md={1}>
            <Typography variant="body2" color="text.secondary">{filteredRules.length} / {rules.length}</Typography>
          </Grid>
        </Grid>
      </Paper>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white' }}>SID</TableCell>
              <TableCell sx={{ color: 'white' }}>Description</TableCell>
              <TableCell sx={{ color: 'white' }}>Category</TableCell>
              <TableCell sx={{ color: 'white' }}>Rule</TableCell>
              <TableCell sx={{ color: 'white' }}>Enabled</TableCell>
              {isAdmin && <TableCell sx={{ color: 'white' }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRules.length === 0 ? (
              <TableRow><TableCell colSpan={colSpan} align="center">No rules found</TableCell></TableRow>
            ) : Object.entries(groupedRules).map(([groupName, groupRules]) => (
              <React.Fragment key={groupName}>
                {groupBy !== 'none' && (
                  <TableRow sx={{ bgcolor: 'grey.100', cursor: 'pointer' }}
                    onClick={() => toggleGroup(groupName)}>
                    <TableCell colSpan={colSpan} sx={{ py: 0.5 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {collapsedGroups[groupName] ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
                        <Typography variant="subtitle2" fontWeight="bold">{groupName}</Typography>
                        <Chip size="small" label={groupRules.length} sx={{ ml: 1 }} />
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {!collapsedGroups[groupName] && groupRules.map(rule => (
                  <RuleRow key={rule.id} rule={rule} />
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{editRule ? 'Edit Rule' : 'New Rule'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Tabs value={createMode} onChange={(_, v) => { setCreateMode(v); setError(''); }}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Direct" />
            <Tab label="UI Form" />
            <Tab label="AI" />
          </Tabs>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Description" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Category" value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
            </Grid>
          </Grid>
          <Divider sx={{ mb: 2 }} />
          {createMode === 0 && (
            <TextField fullWidth multiline rows={4} label="Rule text"
              value={form.rule_text} onChange={e => setForm(p => ({ ...p, rule_text: e.target.value }))}
              placeholder='alert tcp any any -> any 80 (msg:"HTTP traffic"; sid:1000001; rev:1;)' />
          )}
          {createMode === 1 && (
            <UiFormMode uiForm={uiForm} setUiForm={setUiForm}
              previewText={previewText} onPreviewEdit={handlePreviewEdit} />
          )}
          {createMode === 2 && (
            <AiMode aiPrompt={aiPrompt} setAiPrompt={setAiPrompt}
              aiResult={aiResult} setAiResult={setAiResult}
              aiLoading={aiLoading} onGenerate={handleAiGenerate} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={createMode === 2 && !aiResult}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}