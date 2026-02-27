import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

import { ThemeProvider } from './context/ThemeContext';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Forecast from './pages/Forecast';
import RiskAnalysis from './pages/RiskAnalysis';
import WhatIfSimulator from './pages/WhatIfSimulator';
import Recommendations from './pages/Recommendations';
import ChatAssistant from './pages/ChatAssistant';

// App shell layout (no auth guard)
const AppLayout: React.FC = () => (
  <div className="flex h-screen overflow-hidden grid-bg">
    <Sidebar />
    <main className="flex-1 overflow-y-auto p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={window.location.pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </main>
  </div>
);

const App: React.FC = () => (
  <ThemeProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(13,18,36,0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: 12,
          },
        }}
      />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/risk" element={<RiskAnalysis />} />
          <Route path="/simulator" element={<WhatIfSimulator />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/chat" element={<ChatAssistant />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
