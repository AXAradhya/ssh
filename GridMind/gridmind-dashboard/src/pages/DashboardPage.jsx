import { useState, useEffect, useMemo } from 'react';
import ForecastChart from '../components/ForecastChart';
import RiskGauge from '../components/RiskGauge';
import InterventionFeed from '../components/InterventionFeed';
import LoadSplitChart from '../components/LoadSplitChart';
import GreenWindows from '../components/GreenWindows';
import CarbonScore from '../components/CarbonScore';
import ImpactCounter from '../components/ImpactCounter';
import {
  getForecasts, getRiskSummary, getInterventions,
  getCarbonTimeline, getZoneScores, getImpactMetrics, getLoadSplit,
} from '../api/apiClient';

export default function DashboardPage() {
  const [forecastData, setForecastData] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [carbonTimeline, setCarbonTimeline] = useState([]);
  const [zoneScores, setZoneScores] = useState([]);
  const [impactMetrics, setImpactMetrics] = useState(null);
  const [loadSplitData, setLoadSplitData] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    try {
      const [fc, risk, intv, ct, zs, im, ls] = await Promise.all([
        getForecasts(48),
        getRiskSummary(),
        getInterventions(),
        getCarbonTimeline(),
        getZoneScores(),
        getImpactMetrics(),
        getLoadSplit(),
      ]);
      setForecastData(fc.forecasts || []);
      setRiskData(risk);
      setInterventions((intv.interventions || []).slice(0, 7));
      setCarbonTimeline(ct.timeline || []);
      setZoneScores(zs.zones || []);
      setImpactMetrics(im);
      setLoadSplitData(ls.data || []);
    } catch (err) {
      console.error("API fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚡</div>
          <div>Loading GridMind data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <ImpactCounter metrics={impactMetrics} />
      <ForecastChart data={forecastData} />
      <RiskGauge riskData={riskData} />
      <LoadSplitChart data={loadSplitData} />
      <InterventionFeed interventions={interventions} />
      <CarbonScore zones={zoneScores} />
      <GreenWindows carbonTimeline={carbonTimeline} />
    </div>
  );
}
