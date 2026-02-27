import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus, CheckCircle, Filter } from 'lucide-react';
import { getInterventions, createIntervention, resolveIntervention } from '../api/apiClient';

export default function InterventionsPage() {
  const [interventions, setInterventions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'nudge', category: '', text: '', priority: 'medium', icon: '⚡' });
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const res = await getInterventions();
      setInterventions(res.interventions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = filter === 'all' ? interventions : interventions.filter(i => i.type === filter);
  const types = ['all', 'alert', 'tariff', 'nudge', 'curtail', 'green'];
  const typeColors = { alert: '#ef4444', tariff: '#f59e0b', nudge: '#10b981', curtail: '#8b5cf6', green: '#06b6d4' };
  const typeIcons = { alert: '⚡', tariff: '💰', nudge: '🔋', curtail: '🏭', green: '🌿' };

  async function handleCreate() {
    await createIntervention({ ...newItem, icon: typeIcons[newItem.type] || '⚡' });
    setShowCreate(false);
    setNewItem({ type: 'nudge', category: '', text: '', priority: 'medium', icon: '⚡' });
    loadData();
  }

  async function handleResolve(id) {
    await resolveIntervention(id);
    loadData();
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div className="dashboard-grid">
      {/* Stats Bar */}
      <div className="glass-card grid-col-12 animate-fade-in">
        <div className="card-header">
          <span className="card-title"><Bot /> AI Intervention Management</span>
          <button onClick={() => setShowCreate(!showCreate)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)',
            background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
          }}>
            <Plus size={14} /> New Intervention
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600,
              border: `1px solid ${filter === t ? (typeColors[t] || 'var(--accent-primary)') : 'var(--glass-border)'}`,
              background: filter === t ? `${typeColors[t] || 'var(--accent-primary)'}22` : 'transparent',
              color: filter === t ? (typeColors[t] || 'var(--accent-primary)') : 'var(--text-muted)',
              cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit',
            }}>
              {t === 'all' ? `All (${interventions.length})` : `${typeIcons[t] || ''} ${t} (${interventions.filter(i => i.type === t).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card grid-col-12 animate-fade-in">
          <div className="card-header"><span className="card-title"><Plus /> Create New Intervention</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Type</label>
              <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                {['alert', 'tariff', 'nudge', 'curtail', 'green'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Priority</label>
              <select value={newItem.priority} onChange={e => setNewItem({ ...newItem, priority: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                {['critical', 'high', 'medium', 'low', 'info'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Category</label>
              <input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                placeholder="e.g. PEAK OVERLOAD ALERT" style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Description</label>
              <textarea value={newItem.text} onChange={e => setNewItem({ ...newItem, text: e.target.value })}
                rows={3} placeholder="Detailed intervention description..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
            <button onClick={handleCreate} style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit' }}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Intervention Cards */}
      <div className="grid-col-12" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {filtered.map((item, i) => (
          <motion.div key={item.id} className={`glass-card intervention-card type-${item.type}`}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="intervention-type" style={{ color: typeColors[item.type] || 'var(--text-muted)' }}>
                  {item.icon} {item.category}
                </div>
                <div className="intervention-text" style={{ marginTop: 8 }}>{item.text}</div>
                <div className="intervention-meta">
                  <span>🤖 GridMind AI</span><span>•</span><span>{item.timestamp}</span>
                  <span>•</span>
                  <span style={{
                    padding: '1px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 600,
                    background: item.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                    color: item.status === 'active' ? '#10b981' : 'var(--text-muted)',
                  }}>{item.status}</span>
                </div>
              </div>
              {item.status === 'active' && (
                <button onClick={() => handleResolve(item.id)} title="Mark as resolved" style={{
                  padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.3)',
                  background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', fontSize: '0.72rem',
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
                }}>
                  <CheckCircle size={12} /> Resolve
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
