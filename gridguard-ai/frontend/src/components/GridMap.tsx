import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

// We must declare L on the window object since we loaded it via CDN in index.html
declare global {
    interface Window {
        L: any;
    }
}

interface NodeData {
    id: string;
    lat: number;
    lng: number;
    name: string;
    type: 'substation' | 'solar' | 'wind' | 'industrial' | 'residential';
    status: 'normal' | 'warning' | 'critical';
    asset_id?: string;
}

interface EdgeData {
    source: string;
    target: string;
    flow: number;
    capacity: number;
}

const NODES: NodeData[] = [
    { id: 'n1', lat: 28.7997, lng: 77.0423, name: 'Bawana Solar Plant', type: 'solar', status: 'normal', asset_id: 'SOL-Bawana' },
    { id: 'n2', lat: 28.7158, lng: 77.1180, name: 'Rohini Substation', type: 'substation', status: 'warning', asset_id: 'TX-Rohini' },
    { id: 'n3', lat: 28.5355, lng: 77.2652, name: 'Okhla Eco Hub', type: 'wind', status: 'normal', asset_id: 'WT-Okhla' },
    { id: 'n4', lat: 28.4595, lng: 77.0266, name: 'Gurugram Tech Zone', type: 'industrial', status: 'critical' },
    { id: 'n5', lat: 28.5244, lng: 77.1557, name: 'Vasant Kunj Res.', type: 'residential', status: 'normal' },
    { id: 'n6', lat: 28.6304, lng: 77.2177, name: 'Connaught Place Hub', type: 'substation', status: 'normal', asset_id: 'TX-CP' },
];

const EDGES: EdgeData[] = [
    { source: 'n1', target: 'n2', flow: 150, capacity: 200 },
    { source: 'n3', target: 'n6', flow: 80, capacity: 150 },
    { source: 'n2', target: 'n6', flow: 300, capacity: 500 },
    { source: 'n6', target: 'n4', flow: 380, capacity: 450 },
    { source: 'n6', target: 'n5', flow: 210, capacity: 300 },
];

const GridMap: React.FC<{ physics?: any }> = ({ physics }) => {
    const mapRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [assetHealth, setAssetHealth] = useState<any[]>([]);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await api.getAssetHealth(1.5, 2.0);
                setAssetHealth(res.data.assets);
            } catch (e) { }
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!containerRef.current || !window.L) return;

        // Initialize Map only once
        const map = window.L.map(containerRef.current, {
            center: [28.6139, 77.2090],
            zoom: 10,
            zoomControl: false,
            attributionControl: false
        });
        mapRef.current = map;

        // Add standard OpenStreetMap tiles
        const tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        // Apply dark mode CSS inversion matrix directly to the native leaflet tile pane
        tileLayer.getContainer().style.filter = 'invert(100%) hue-rotate(180deg) brightness(85%) contrast(150%) opacity(0.8)';
        tileLayer.getContainer().style.transition = 'filter 0.5s ease-in-out';

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !window.L) return;

        // Clear existing markers & lines
        map.eachLayer((layer: any) => {
            if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline || layer instanceof window.L.CircleMarker) {
                map.removeLayer(layer);
            }
        });

        const getNodeColor = (status: string) => {
            if (status === 'critical') return '#ff3c3c';
            if (status === 'warning') return '#f97316';
            return '#00ff88';
        };

        const getEdgeColor = (flow: number, capacity: number) => {
            const ratio = flow / capacity;
            if (ratio > 0.85) return '#ff3c3c';
            if (ratio > 0.7) return '#f97316';
            return '#00d4ff';
        };

        // Draw Nodes
        const nodeMap = new Map();
        NODES.forEach(n => {
            nodeMap.set(n.id, [n.lat, n.lng]);
            const color = getNodeColor(n.status);
            const assetData = assetHealth.find(a => a.asset_id === n.asset_id);
            const isDegraded = assetData && assetData.health_pct < 60;

            // Outer Glow Circle
            window.L.circleMarker([n.lat, n.lng], {
                radius: 12,
                fillColor: color,
                color: color,
                weight: 1,
                opacity: 0.5,
                fillOpacity: 0.2
            }).addTo(map);

            // Inner Core Node
            const marker = window.L.circleMarker([n.lat, n.lng], {
                radius: 4,
                fillColor: color,
                color: '#fff',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 1
            }).addTo(map);

            // Setup Popup content
            let popupContent = `
                <div style="background:#050814; color:#fff; padding:8px; border-radius:6px; border:1px solid rgba(0,212,255,0.2);">
                    <strong style="color:${color}; display:block; margin-bottom:4px;">${n.name}</strong>
                    <div style="font-size:11px; color:#aaa;">Type: ${n.type.toUpperCase()}</div>
                    <div style="font-size:11px; color:#aaa;">Status: ${n.status.toUpperCase()}</div>
            `;
            if (isDegraded) {
                popupContent += `<div style="font-size:11px; color:#ff3c3c; margin-top:4px;">⚠️ Asset Degradation Detected</div>`;
            }
            popupContent += `</div>`;

            marker.bindPopup(popupContent, {
                closeButton: false,
                className: 'custom-leaflet-popup'
            });
        });

        // Draw Edges (Power Lines)
        EDGES.forEach(edge => {
            const startNode = nodeMap.get(edge.source);
            const endNode = nodeMap.get(edge.target);
            if (startNode && endNode) {
                const eColor = getEdgeColor(edge.flow, edge.capacity);

                // Base faint line
                window.L.polyline([startNode, endNode], {
                    color: eColor,
                    weight: 2,
                    opacity: 0.3
                }).addTo(map);

                // Dashed flow line
                window.L.polyline([startNode, endNode], {
                    color: eColor,
                    weight: 2,
                    opacity: 0.8,
                    dashArray: '5, 10'
                }).addTo(map);
            }
        });

    }, [physics, assetHealth]);

    return (
        <div className="relative w-full aspect-[4/3] sm:aspect-video bg-[#050814] rounded-xl overflow-hidden border border-white/5" style={{ zIndex: 0 }}>
            {/* Location Label */}
            <div className="absolute top-4 left-4 z-[500] bg-black/60 p-2 rounded border border-white/10 backdrop-blur-md pointer-events-none">
                <div className="text-white font-bold text-sm">📍 New Delhi Interactive Map</div>
                <div className="text-slate-400 text-xs">Lat/Lng Data Sync Active</div>
            </div>

            {/* Leaflet Map Container */}
            <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

            {/* Inject minimal CSS overrides for leaflet popups on the fly */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .leaflet-container { background: #050814 !important; }
                .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
                .leaflet-popup-tip-container { display: none !important; }
                .custom-leaflet-popup { pointer-events: none !important; margin-bottom: 15px !important; }
                .leaflet-control-attribution { background: rgba(0,0,0,0.5) !important; color: #888 !important; }
                .leaflet-control-attribution a { color: #00d4ff !important; }
            `}} />
        </div>
    );
};

export default GridMap;
