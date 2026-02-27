import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const client = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;
let loginPromise: Promise<string> | null = null;

const getAuthToken = async () => {
    if (authToken) return authToken;
    if (loginPromise) return loginPromise;

    loginPromise = axios.post(`${API_BASE}/api/auth/login`, {
        username: 'admin',
        password: 'admin123'
    }).then(res => {
        authToken = res.data.access_token;
        return authToken as string;
    }).catch(err => {
        console.error("Auto-login failed:", err);
        return "";
    });

    return loginPromise;
};

client.interceptors.request.use(async (config) => {
    if (!config.url?.includes('/api/auth/login')) {
        const token = await getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default client;

// ── API helpers ──────────────────────────────────────────────────────────────
export const api = {
    getDashboard: () => client.get('/api/dashboard/metrics'),

    getLoadForecast: (hours = 24) =>
        client.get(`/api/forecast/load?hours=${hours}`),

    getRenewableForecast: (hours = 24) =>
        client.get(`/api/forecast/renewable?hours=${hours}`),

    getPeakRisk: () => client.get('/api/risk/peak-analysis'),

    getAnomalies: (hours = 24) => client.get(`/api/risk/anomalies?hours=${hours}`),

    whatIf: (params: {
        temperature_delta: number;
        industrial_usage_delta_pct: number;
        renewable_boost_pct: number;
        hours: number;
    }) => client.post('/api/simulate/what-if', params),

    getRecommendations: () => client.get('/api/recommendations'),

    getShapExplanation: () => client.get('/api/shap/explanation'),

    chat: (message: string) => client.post('/api/chat', { message }),

    // 🟩🟩🟩 Advanced Features 🟩🟩🟩
    getNegotiation: (currentLoad: number, capacity: number) =>
        client.get(`/api/advanced/negotiate?current_load_mw=${currentLoad}&capacity_mw=${capacity}`),

    getAssetHealth: (loadStress: number, weatherSeverity: number) =>
        client.get(`/api/advanced/assets?load_stress=${loadStress}&severe_weather_factor=${weatherSeverity}`),

    getLivePrice: (currentLoad: number, renewablePct: number) =>
        client.get(`/api/advanced/eco/price?current_load_mw=${currentLoad}&renewable_pct=${renewablePct}`),

    mineCarbonBlock: (producerId: string, consumerId: string, mwhTraded: number) =>
        client.post(`/api/advanced/eco/ledger/mine?producer_id=${producerId}&consumer_id=${consumerId}&mwh_traded=${mwhTraded}`),

    getLedger: () => client.get('/api/advanced/eco/ledger'),

    getGridPhysics: (currentLoad: number, solarMw: number, windMw: number, severityFlag: number) =>
        client.get(`/api/advanced/grid/physics?current_load_mw=${currentLoad}&solar_mw=${solarMw}&wind_mw=${windMw}&severity_flag=${severityFlag}`),

    getEVSchedule: (baseLoadMw: number, solarMw: number, evCount: number) =>
        client.get(`/api/advanced/ev/schedule?base_load_mw=${baseLoadMw}&solar_mw=${solarMw}&ev_count=${evCount}`),

    queryNLP: (query: string) =>
        client.post(`/api/advanced/nlp/query?query=${encodeURIComponent(query)}`),

    // 🟩🟩🟩 High-End ML Models (Phase 1/2 Expansion) 🟩🟩🟩
    getIdsScan: (trafficRate: number, failedAuth: number, foreignIps: number) =>
        client.get(`/api/advanced/security/ids?current_traffic_rate=${trafficRate}&failed_auth_attempts=${failedAuth}&foreign_ips_detected=${foreignIps}`),

    getTransformerTwin: (loadMw: number, ambientC: number, hours: number) =>
        client.get(`/api/advanced/assets/transformer?current_load_mw=${loadMw}&ambient_temp_c=${ambientC}&elapsed_hours=${hours}`),

    getVppCapacity: (hour: number, weather: string) =>
        client.get(`/api/advanced/vpp/capacity?current_hour=${hour}&weather_condition=${weather}`),

    getTradingBid: (hour: number, forecastedLoad: number, forecastedRen: number, batterySoc: number) =>
        client.get(`/api/advanced/trading/bid?current_hour=${hour}&forecasted_load_mw=${forecastedLoad}&forecasted_renewable_mw=${forecastedRen}&battery_soc_mwh=${batterySoc}`),

    getTopologyHeal: (failedNode: string, targetNode: string, requiredMw: number) =>
        client.get(`/api/advanced/topology/heal?failed_node=${failedNode}&target_node=${targetNode}&required_mw=${requiredMw}`),

    getPmuMonitor: (loadMw: number, windPct: number) =>
        client.get(`/api/advanced/pmu/monitor?current_load_mw=${loadMw}&wind_penetration_pct=${windPct}`),

    // 🟩🟩🟩 Operations & Integrations (Phase 2 Expansion) 🟩🟩🟩
    getLeaderboard: () => client.get('/api/operations/gamification/leaderboard'),

    getDroneSchedule: () => client.get('/api/operations/drones/schedule')
};
