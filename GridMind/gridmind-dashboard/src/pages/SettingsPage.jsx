import { useState, useEffect, useRef } from 'react';
import { Settings, Database, Upload, Trash2, RefreshCw, HardDrive } from 'lucide-react';
import { getDatasets, getDbStats, uploadDataset, clearAndReseed, deleteDataset } from '../api/apiClient';

export default function SettingsPage() {
  const [datasets, setDatasets] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  async function load() {
    try {
      const [ds, st] = await Promise.all([getDatasets(), getDbStats()]);
      setDatasets(ds.datasets || []);
      setDbStats(st);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadDataset(file);
      setUploadResult(res);
      load();
    } catch (e) {
      setUploadResult({ status: 'error', message: e.message });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleClear() {
    if (!confirm('Clear all data and re-seed? This cannot be undone.')) return;
    setLoading(true);
    await clearAndReseed();
    load();
  }

  async function handleDelete(id) {
    await deleteDataset(id);
    load();
  }

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)' }}>Loading...</div>;

  const statItems = dbStats ? [
    { label:'Load Records', value: dbStats.loadRecords?.toLocaleString(), icon: Database },
    { label:'Forecasts', value: dbStats.forecastRecords?.toLocaleString(), icon: HardDrive },
    { label:'Interventions', value: dbStats.interventions, icon: Settings },
    { label:'Zones', value: dbStats.zones, icon: HardDrive },
    { label:'Alerts', value: dbStats.alerts, icon: HardDrive },
    { label:'Datasets', value: dbStats.datasets, icon: Database },
  ] : [];

  return (
    <div className="dashboard-grid">
      {/* DB Stats */}
      <div className="glass-card grid-col-12 animate-fade-in">
        <div className="card-header">
          <span className="card-title"><Database /> Database Overview</span>
          <button onClick={handleClear} style={{
            display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:'var(--radius-md)',
            border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',color:'#ef4444',
            cursor:'pointer',fontSize:'0.78rem',fontWeight:600,fontFamily:'inherit',
          }}><RefreshCw size={13} /> Clear & Re-seed</button>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:`repeat(${statItems.length},1fr)`,gap:'var(--space-md)' }}>
          {statItems.map((s,i) => (
            <div key={i} style={{ textAlign:'center',padding:'var(--space-md)',background:'rgba(255,255,255,0.03)',borderRadius:'var(--radius-md)' }}>
              <s.icon size={20} style={{ color:'var(--accent-primary)',marginBottom:4 }} />
              <div style={{ fontFamily:'JetBrains Mono',fontSize:'1.3rem',fontWeight:700,color:'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize:'0.7rem',color:'var(--text-muted)',textTransform:'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="glass-card grid-col-6 animate-fade-in" style={{ animationDelay:'0.1s' }}>
        <div className="card-header"><span className="card-title"><Upload /> Upload Dataset</span></div>
        <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)',marginBottom:'var(--space-md)',lineHeight:1.5 }}>
          Upload a CSV file with columns: <code style={{ background:'rgba(255,255,255,0.06)',padding:'1px 6px',borderRadius:4,fontSize:'0.78rem' }}>timestamp, demand_mw</code>.
          Optional: <code style={{ background:'rgba(255,255,255,0.06)',padding:'1px 6px',borderRadius:4,fontSize:'0.78rem' }}>industrial_mw, residential_mw, temperature_c</code>
        </p>
        <div style={{
          border:'2px dashed var(--glass-border)',borderRadius:'var(--radius-md)',padding:'var(--space-xl)',
          textAlign:'center',cursor:'pointer',transition:'all 0.2s',
        }} onClick={() => fileRef.current?.click()}>
          <Upload size={32} style={{ color:'var(--text-muted)',marginBottom:8 }} />
          <div style={{ fontSize:'0.85rem',color:'var(--text-secondary)' }}>{uploading ? 'Uploading...' : 'Click to select CSV file'}</div>
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} style={{ display:'none' }} />
        {uploadResult && (
          <div style={{
            marginTop:'var(--space-md)',padding:'var(--space-md)',borderRadius:'var(--radius-md)',fontSize:'0.82rem',
            background: uploadResult.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: uploadResult.status === 'success' ? '#10b981' : '#ef4444',
          }}>
            {uploadResult.status === 'success'
              ? `✅ Uploaded "${uploadResult.filename}" — ${uploadResult.rowsAdded} rows added (${uploadResult.dateRange})`
              : `❌ ${uploadResult.message || 'Upload failed'}`
            }
          </div>
        )}
        {/* Gemini Analysis Results */}
        {uploadResult?.analysis && !uploadResult.analysis.error && (
          <div style={{
            marginTop:'var(--space-md)',padding:'var(--space-md)',borderRadius:'var(--radius-md)',
            background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.2)',
          }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
              <span style={{ fontSize:'0.75rem',fontWeight:700,color:'#8b5cf6',textTransform:'uppercase' }}>✨ Gemini AI Analysis</span>
              {uploadResult.analysis.risk_level && (
                <span style={{
                  fontSize:'0.62rem',padding:'2px 6px',borderRadius:4,fontWeight:600,
                  background: uploadResult.analysis.risk_level === 'high' ? 'rgba(239,68,68,0.15)' : uploadResult.analysis.risk_level === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                  color: uploadResult.analysis.risk_level === 'high' ? '#ef4444' : uploadResult.analysis.risk_level === 'medium' ? '#f59e0b' : '#10b981',
                }}>RISK: {uploadResult.analysis.risk_level.toUpperCase()}</span>
              )}
            </div>
            {uploadResult.analysis.summary && <p style={{ fontSize:'0.8rem',color:'var(--text-secondary)',marginBottom:8,lineHeight:1.5 }}>{uploadResult.analysis.summary}</p>}
            {uploadResult.analysis.patterns?.length > 0 && (
              <div style={{ marginBottom:6 }}>
                <div style={{ fontSize:'0.68rem',color:'var(--text-muted)',marginBottom:3 }}>📊 PATTERNS</div>
                {uploadResult.analysis.patterns.map((p,i) => <div key={i} style={{ fontSize:'0.75rem',color:'var(--text-secondary)',paddingLeft:8 }}>• {p}</div>)}
              </div>
            )}
            {uploadResult.analysis.recommendations?.length > 0 && (
              <div>
                <div style={{ fontSize:'0.68rem',color:'var(--text-muted)',marginBottom:3 }}>💡 RECOMMENDATIONS</div>
                {uploadResult.analysis.recommendations.map((r,i) => <div key={i} style={{ fontSize:'0.75rem',color:'var(--accent-primary)',paddingLeft:8 }}>• {r}</div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Datasets List */}
      <div className="glass-card grid-col-6 animate-fade-in" style={{ animationDelay:'0.15s' }}>
        <div className="card-header"><span className="card-title"><HardDrive /> Datasets</span></div>
        {datasets.length === 0 ? (
          <div style={{ textAlign:'center',color:'var(--text-muted)',padding:'var(--space-xl)' }}>No datasets uploaded yet.</div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:'var(--space-sm)' }}>
            {datasets.map(d => (
              <div key={d.id} style={{
                display:'flex',alignItems:'center',gap:'var(--space-md)',padding:'var(--space-sm) var(--space-md)',
                background:'rgba(255,255,255,0.02)',borderRadius:'var(--radius-md)',
              }}>
                <Database size={16} style={{ color:'var(--accent-primary)',flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.82rem',fontWeight:600 }}>{d.name}</div>
                  <div style={{ fontSize:'0.7rem',color:'var(--text-muted)' }}>
                    {d.rows} rows • {d.source} • {d.dateRangeStart || '—'}
                  </div>
                </div>
                <button onClick={() => handleDelete(d.id)} style={{
                  padding:'4px 8px',borderRadius:'var(--radius-sm)',border:'1px solid rgba(239,68,68,0.2)',
                  background:'transparent',color:'#ef4444',cursor:'pointer',
                }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Info */}
      <div className="glass-card grid-col-12 animate-fade-in" style={{ animationDelay:'0.2s' }}>
        <div className="card-header"><span className="card-title"><Settings /> System Configuration</span></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-lg)' }}>
          <div>
            <div style={{ fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:4,textTransform:'uppercase' }}>API Endpoint</div>
            <div style={{ fontFamily:'JetBrains Mono',fontSize:'0.85rem',color:'var(--accent-primary)',padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:'var(--radius-sm)' }}>http://localhost:8000</div>
          </div>
          <div>
            <div style={{ fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:4,textTransform:'uppercase' }}>API Documentation</div>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ fontFamily:'JetBrains Mono',fontSize:'0.85rem',color:'var(--accent-cyan)',padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:'var(--radius-sm)',display:'block',textDecoration:'none' }}>http://localhost:8000/docs ↗</a>
          </div>
          <div>
            <div style={{ fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:4,textTransform:'uppercase' }}>Database</div>
            <div style={{ fontFamily:'JetBrains Mono',fontSize:'0.85rem',color:'var(--text-secondary)',padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:'var(--radius-sm)' }}>SQLite — gridmind.db</div>
          </div>
          <div>
            <div style={{ fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:4,textTransform:'uppercase' }}>Forecast Model</div>
            <div style={{ fontFamily:'JetBrains Mono',fontSize:'0.85rem',color:'var(--accent-green)',padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:'var(--radius-sm)' }}>Prophet (Active)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
