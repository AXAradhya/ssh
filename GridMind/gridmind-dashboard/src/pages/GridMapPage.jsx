import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { MapPin, Zap, Activity } from 'lucide-react';
import { getGridStations } from '../api/apiClient';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue in Vite/webpack
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const statusColors = {
  online: '#10b981',
  overloaded: '#ef4444',
  maintenance: '#f59e0b',
  offline: '#64748b',
};

const typeIcons = {
  generating: '⚡',
  substation: '🔌',
  distribution: '🏠',
};

export default function GridMapPage() {
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getGridStations();
        setStations(res.stations || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)' }}>Loading grid map...</div>;

  const delhiCenter = [28.6139, 77.2090];

  const totalCapacity = stations.reduce((s, st) => s + st.capacityMW, 0);
  const totalLoad = stations.reduce((s, st) => s + st.currentLoadMW, 0);
  const overloaded = stations.filter(s => s.status === 'overloaded').length;
  const online = stations.filter(s => s.status === 'online').length;

  return (
    <div className="dashboard-grid">
      {/* Stats Bar */}
      <div className="glass-card grid-col-12 animate-fade-in">
        <div className="card-header">
          <span className="card-title"><MapPin /> Delhi Power Grid Map</span>
          <span className="card-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
            {stations.length} STATIONS
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
          {[
            { label: 'Total Capacity', value: `${(totalCapacity / 1000).toFixed(1)} GW`, color: 'var(--accent-primary)' },
            { label: 'Current Load', value: `${(totalLoad / 1000).toFixed(1)} GW`, color: 'var(--accent-cyan)' },
            { label: 'Online', value: online, color: 'var(--accent-green)' },
            { label: 'Overloaded', value: overloaded, color: 'var(--accent-red)' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Map + Detail Panel */}
      <div className="glass-card grid-col-8 animate-fade-in" style={{ animationDelay: '0.1s', padding: 0, overflow: 'hidden', minHeight: 480 }}>
        <MapContainer center={delhiCenter} zoom={11} style={{ width: '100%', height: 480, borderRadius: 'var(--radius-lg)' }}
          zoomControl={true} attributionControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {stations.map(s => (
            <CircleMarker key={s.id} center={[s.lat, s.lng]}
              radius={s.type === 'generating' ? 14 : s.type === 'substation' ? 10 : 7}
              pathOptions={{
                color: statusColors[s.status] || '#64748b',
                fillColor: statusColors[s.status] || '#64748b',
                fillOpacity: 0.7,
                weight: 2,
              }}
              eventHandlers={{ click: () => setSelected(s) }}>
              <Popup>
                <div style={{ color: '#1e293b', minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{typeIcons[s.type]} {s.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>{s.zone}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.78rem' }}>
                    <span>Capacity:</span><span style={{ fontWeight: 600 }}>{s.capacityMW} MW</span>
                    <span>Load:</span><span style={{ fontWeight: 600, color: s.loadPercent > 85 ? '#ef4444' : '#10b981' }}>{s.currentLoadMW} MW ({s.loadPercent}%)</span>
                    <span>Voltage:</span><span style={{ fontWeight: 600 }}>{s.voltageKV} kV</span>
                    <span>Status:</span><span style={{ fontWeight: 600, color: statusColors[s.status], textTransform: 'uppercase' }}>{s.status}</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Station List */}
      <div className="glass-card grid-col-4 animate-fade-in" style={{ animationDelay: '0.15s', maxHeight: 480, overflowY: 'auto' }}>
        <div className="card-header">
          <span className="card-title"><Activity /> Station List</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          {stations.map(s => (
            <div key={s.id} onClick={() => setSelected(s)}
              style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: selected?.id === s.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                border: selected?.id === s.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{typeIcons[s.type]} {s.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.zone} · {s.voltageKV} kV</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', fontWeight: 600, color: s.loadPercent > 85 ? '#ef4444' : s.loadPercent > 65 ? '#f59e0b' : '#10b981' }}>{s.loadPercent}%</div>
                  <div style={{ fontSize: '0.62rem', color: statusColors[s.status], textTransform: 'uppercase', fontWeight: 600 }}>{s.status}</div>
                </div>
              </div>
              {/* Load bar */}
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${s.loadPercent}%`, height: '100%', borderRadius: 2,
                  background: s.loadPercent > 85 ? '#ef4444' : s.loadPercent > 65 ? '#f59e0b' : '#10b981',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="glass-card grid-col-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend:</span>
          {[
            { label: '⚡ Generating Station', size: 14 },
            { label: '🔌 Substation (220/400 kV)', size: 10 },
            { label: '🏠 Distribution (33 kV)', size: 7 },
          ].map((l, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: l.size * 2, height: l.size * 2, borderRadius: '50%', border: '2px solid #3b82f6', background: 'rgba(59,130,246,0.3)' }} />
              {l.label}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-md)' }}>
            {Object.entries(statusColors).map(([k, v]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: v, textTransform: 'uppercase', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: v }} />{k}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
