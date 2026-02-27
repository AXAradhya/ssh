import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ForecastsPage from './pages/ForecastsPage';
import InterventionsPage from './pages/InterventionsPage';
import CarbonPage from './pages/CarbonPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import GridMapPage from './pages/GridMapPage';
import SimulatorPage from './pages/SimulatorPage';
import Chatbot from './components/Chatbot';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Header />
          <div className="dashboard-scroll">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/forecasts" element={<ForecastsPage />} />
              <Route path="/interventions" element={<InterventionsPage />} />
              <Route path="/carbon" element={<CarbonPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/grid-map" element={<GridMapPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
            </Routes>
          </div>
        </main>
      </div>
      <Chatbot />
    </BrowserRouter>
  );
}
