const API_BASE = "http://localhost:8000/api";

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ============ FORECAST ============
export async function getForecasts(hours = 48) {
  return fetchJSON(`/forecast?hours=${hours}`);
}

export async function getRiskSummary() {
  return fetchJSON("/forecast/risk");
}

export async function getCarbonTimeline() {
  return fetchJSON("/forecast/carbon-timeline");
}

// ============ LOAD DATA ============
export async function getLoadData(days = 7, resolution = "hourly") {
  return fetchJSON(`/load?days=${days}&resolution=${resolution}`);
}

export async function getLoadSplit() {
  return fetchJSON("/load/split");
}

export async function getLoadStats() {
  return fetchJSON("/load/stats");
}

// ============ CARBON ============
export async function getZoneScores() {
  return fetchJSON("/carbon/scores");
}

export async function getImpactMetrics() {
  return fetchJSON("/carbon/impact");
}

export async function getEnergyMix() {
  return fetchJSON("/carbon/energy-mix");
}

export async function getCarbonSummary() {
  return fetchJSON("/carbon/summary");
}

// ============ ANALYSIS ============
export async function getModelAccuracy() {
  return fetchJSON("/forecast/model-accuracy");
}

// ============ GRID MAP ============
export async function getGridStations() {
  return fetchJSON("/grid/stations");
}

// ============ INTERVENTIONS ============
export async function getInterventions(status = null) {
  const q = status ? `?status=${status}` : "";
  return fetchJSON(`/interventions${q}`);
}

export async function createIntervention(data) {
  return fetchJSON("/interventions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resolveIntervention(id) {
  return fetchJSON(`/interventions/${id}/resolve`, { method: "PUT" });
}

// ============ ALERTS ============
export async function getAlerts(severity = null) {
  const q = severity ? `?severity=${severity}` : "";
  return fetchJSON(`/alerts${q}`);
}

export async function resolveAlert(id) {
  return fetchJSON(`/alerts/${id}/resolve`, { method: "PUT" });
}

// ============ DATA MANAGEMENT ============
export async function getDatasets() {
  return fetchJSON("/data/datasets");
}

export async function getDbStats() {
  return fetchJSON("/data/stats");
}

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/data/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function clearAndReseed() {
  return fetchJSON("/data/clear", { method: "DELETE" });
}

export async function deleteDataset(id) {
  return fetchJSON(`/data/dataset/${id}`, { method: "DELETE" });
}

// ============ CHATBOT ============
export async function sendChatMessage(message, sessionId = "default") {
  return fetchJSON("/chat/send", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

export async function getChatHistory(sessionId = "default") {
  return fetchJSON(`/chat/history?session_id=${sessionId}`);
}

export async function clearChatHistory(sessionId = "default") {
  return fetchJSON(`/chat/clear?session_id=${sessionId}`, { method: "DELETE" });
}

export async function getAiAlerts() {
  return fetchJSON("/chat/alerts");
}

export async function getGeminiInsights() {
  return fetchJSON("/chat/insights");
}
// ============ SIMULATOR ============
export async function runSimulation(params) {
  return fetchJSON("/simulator/run", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getSimulatorDefaults() {
  return fetchJSON("/simulator/defaults");
}

// ============ HEALTH ============
export async function checkHealth() {
  return fetchJSON("/health");
}
