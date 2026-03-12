import { useState, useEffect, useRef, useCallback } from "react";
import LeafletMap from "./LeafletMap";
import "./App.css";
import {
  fetchForecast, fetchWeather, fetchAlerts,
  loginUser, signupUser, sendChatMessage,
  mapForecastToZones, mapAlertsToLocalAlerts,
  mapIncidentsToTimeline, mapRemediesToCityNews,
  buildWeatherSlogan, buildLiveChatResponse,
  PUNE_LAT, PUNE_LON,
} from "./api";

// ── SVG Icon Components ────────────────────────────────────────────────────────

const Icon = ({ children, size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>
);

const Icons = {
  brain: (p) => <Icon {...p}><path d="M9.5 2A5.5 5.5 0 0 0 5 5.5c0 .35.04.69.11 1.02A4.5 4.5 0 0 0 2 10.5a4.5 4.5 0 0 0 3.53 4.39A5 5 0 0 0 10 19.5V22h4v-2.5a5 5 0 0 0 4.47-4.61A4.5 4.5 0 0 0 22 10.5a4.5 4.5 0 0 0-3.11-4.27c.07-.24.11-.5.11-.73a5.5 5.5 0 0 0-9.5-3.74" /><path d="M12 2v20" /></Icon>,
  sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></Icon>,
  moon: (p) => <Icon {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></Icon>,
  search: (p) => <Icon {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></Icon>,
  x: (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>,
  logOut: (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icon>,
  mapPin: (p) => <Icon {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Icon>,
  map: (p) => <Icon {...p}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></Icon>,
  home: (p) => <Icon {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon>,
  briefcase: (p) => <Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></Icon>,
  shoppingBag: (p) => <Icon {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Icon>,
  dumbbell: (p) => <Icon {...p}><path d="m6.5 6.5 11 11" /><path d="m21 21-1-1" /><path d="m3 3 1 1" /><path d="m18 22 4-4" /><path d="m2 6 4-4" /><path d="m3 10 7-7" /><path d="m14 21 7-7" /></Icon>,
  cloudRain: (p) => <Icon {...p}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M16 14v6M8 14v6M12 16v6" /></Icon>,
  droplets: (p) => <Icon {...p}><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></Icon>,
  construction: (p) => <Icon {...p}><rect x="2" y="6" width="20" height="8" rx="1" /><path d="M17 14v7M7 14v7M17 3v3M7 3v3" /></Icon>,
  zap: (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>,
  alertTriangle: (p) => <Icon {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></Icon>,
  bell: (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Icon>,
  newspaper: (p) => <Icon {...p}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" /></Icon>,
  sliders: (p) => <Icon {...p}><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></Icon>,
  clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>,
  bot: (p) => <Icon {...p}><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2M20 14h2M15 13v2M9 13v2" /></Icon>,
  send: (p) => <Icon {...p}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></Icon>,
  road: (p) => <Icon {...p}><path d="M4 19 8 5M16 5l4 14" /><path d="M12 7v2M12 13v2M12 19v2" /></Icon>,
  building: (p) => <Icon {...p}><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></Icon>,
  gitFork: (p) => <Icon {...p}><circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9M12 12v3" /></Icon>,
  info: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Icon>,
  user: (p) => <Icon {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>,
};

// ── Data ────────────────────────────────────────────────────────────────────────
const CITY = "Pune";

const ZONES = [
  {
    id: 1, name: "Shivajinagar", risk: "critical", flood: 72, traffic: 55, color: "#ef4444",
    problems: [
      { icon: "waterlogging", label: "Waterlogging", severity: 82, estResolution: "4-6 hours", affected: [
          { type: "road", name: "JM Road Underpass", detail: "2.5ft water accumulation" },
          { type: "road", name: "FC Road near Garware Bridge", detail: "Partially submerged" },
          { type: "building", name: "PMC Office Complex", detail: "Basement flooding reported" },
      ]},
      { icon: "traffic", label: "Heavy Traffic", severity: 55, estResolution: "2-3 hours", affected: [
          { type: "road", name: "Jungli Maharaj Road", detail: "Avg speed 6 km/h" },
          { type: "junction", name: "Shivajinagar Bus Stand Junction", detail: "Signal failure, manual control" },
      ]},
      { icon: "power", label: "Electricity Cut", severity: 40, estResolution: "1-2 hours", affected: [
          { type: "area", name: "Shivajinagar Camp Area", detail: "Power outage since 12:15 PM" },
          { type: "building", name: "Collector Office Lane", detail: "Backup generator active" },
      ]},
    ]
  },
  {
    id: 2, name: "Kothrud", risk: "warning", flood: 45, traffic: 38, color: "#facc15",
    problems: [
      { icon: "pothole", label: "Potholes", severity: 65, estResolution: "3-5 days", affected: [
          { type: "road", name: "Paud Road near Kothrud Bus Depot", detail: "3 large potholes, 1 lane blocked" },
          { type: "road", name: "Karve Nagar Internal Road", detail: "Multiple potholes after drainage work" },
      ]},
      { icon: "water", label: "Water Pipe Burst", severity: 48, estResolution: "6-8 hours", affected: [
          { type: "road", name: "Vanaz Corner Pipeline", detail: "16-inch main line burst" },
          { type: "area", name: "Dahanukar Colony", detail: "Water supply disrupted for ~800 households" },
      ]},
    ]
  },
  {
    id: 3, name: "Hinjewadi", risk: "warning", flood: 38, traffic: 61, color: "#facc15",
    problems: [
      { icon: "traffic", label: "Heavy Traffic", severity: 74, estResolution: "3-4 hours", affected: [
          { type: "road", name: "Mumbai-Bangalore Highway (NH-48)", detail: "Bumper-to-bumper from Wakad" },
          { type: "road", name: "Hinjewadi Phase 1-2 Connector", detail: "Avg commute +45 min" },
          { type: "junction", name: "Rajiv Gandhi Infotech Park Entry", detail: "Queue stretching 3 km" },
      ]},
      { icon: "construction", label: "Road Construction", severity: 50, estResolution: "2-3 weeks", affected: [
          { type: "road", name: "Hinjewadi-Wakad Road", detail: "Metro construction, single lane" },
          { type: "road", name: "Phase 3 Service Road", detail: "Resurfacing in progress" },
      ]},
    ]
  },
  { id: 4, name: "Baner", risk: "safe", flood: 18, traffic: 22, color: "#22c55e", problems: [] },
  {
    id: 5, name: "Hadapsar", risk: "critical", flood: 68, traffic: 74, color: "#ef4444",
    problems: [
      { icon: "waterlogging", label: "Waterlogging", severity: 78, estResolution: "5-7 hours", affected: [
          { type: "road", name: "Solapur Road near Hadapsar Gadital", detail: "1.5ft water, buses diverted" },
          { type: "building", name: "Magarpatta City entrance", detail: "Service road waterlogged" },
      ]},
      { icon: "traffic", label: "Heavy Traffic", severity: 74, estResolution: "3-4 hours", affected: [
          { type: "road", name: "Pune-Solapur Highway", detail: "Avg speed 4 km/h" },
          { type: "junction", name: "Hadapsar Gadital Chowk", detail: "Complete gridlock" },
      ]},
      { icon: "garbage", label: "Garbage Overflow", severity: 60, estResolution: "12-24 hours", affected: [
          { type: "area", name: "Sasane Nagar Dumping Point", detail: "Overflow blocking drain" },
          { type: "road", name: "Malwadi Road", detail: "Garbage spill on road" },
      ]},
      { icon: "power", label: "Electricity Cut", severity: 35, estResolution: "30 min", affected: [
          { type: "area", name: "NIBM Road Area", detail: "Intermittent power cuts" },
      ]},
    ]
  },
  { id: 6, name: "Aundh", risk: "safe", flood: 12, traffic: 19, color: "#22c55e", problems: [] },
];


const LOCAL_ALERTS = [
  { iconKey: "droplets", title: "Water cut in your area", desc: "Supply disrupted in Kothrud sector since 2 PM", time: "25 min ago" },
  { iconKey: "construction", title: "Nearby road closure", desc: "Paud Rd blocked due to pipeline repair work", time: "1 hr ago" },
  { iconKey: "zap", title: "Power outage reported", desc: "MSEDCL scheduled maintenance in Karve Nagar", time: "45 min ago" },
];

const CITY_NEWS = [
  { iconKey: "cloudRain", title: "Flood warning for low-lying areas", desc: "PMC issues advisory for riverbank zones", time: "30 min ago" },
  { iconKey: "construction", title: "Metro Phase 2 construction update", desc: "Hinjewadi–Shivajinagar corridor 68% complete", time: "2 hrs ago" },
  { iconKey: "road", title: "Traffic advisory for IT corridor", desc: "Expect delays on Mumbai–Pune Expressway tonight", time: "1 hr ago" },
];



const WEATHER_SLOGANS = [
  "Heavy rainfall across Pune today — stay safe.",
  "Overcast skies with intermittent showers in Pune.",
  "Monsoon alert: 84mm rainfall recorded in the last hour.",
];

const SEARCH_PLACEHOLDERS = [
  "What do you want to know today?",
  "What's happening in the city today?",
  "Ask anything about Pune...",
];

// ── Chatbot Response Engine ────────────────────────────────────────────────────

const CHATBOT_RESPONSES = {
  flood: "Based on current rainfall data (84mm/hr), Shivajinagar and Hadapsar are experiencing significant waterlogging. JM Road underpass has approximately 2.5ft of water accumulation, and Solapur Road near Gadital has 1.5ft. I'd recommend avoiding these areas for the next 4-6 hours. The Pune Municipal Corporation has deployed water pumps at critical underpasses.",
  traffic: "Traffic conditions are currently severe on NH-48 (Mumbai-Bangalore Highway), with bumper-to-bumper congestion from Wakad to Hinjewadi Phase 1. Average speed is approximately 4 km/h in the worst sections. The Hadapsar-Gadital corridor is also experiencing complete gridlock. Consider using the Ring Road as an alternate route if you're headed toward the IT corridor.",
  route: "I can help with route planning. Currently, the fastest route from Kothrud to Hinjewadi avoids Paud Road (blocked for pipeline repair) and takes the University Road → SB Road → Aundh → Baner → Hinjewadi bypass. Estimated travel time is approximately 55 minutes, which is 20 minutes longer than usual due to diversions.",
  weather: "Current conditions in Pune show heavy rainfall at 84mm/hr, which is significantly above the 60mm/hr threshold for flood alerts. The India Meteorological Department has issued an orange alert for the next 12 hours. Temperatures are around 24°C with high humidity. Rain is expected to continue through the night with gradual reduction by tomorrow morning.",
  power: "There are active power outages in two zones: Shivajinagar Camp Area (since 12:15 PM, backup generators active at government buildings) and NIBM Road Area (intermittent cuts). MSEDCL has scheduled maintenance in Karve Nagar, which may cause additional disruptions. Expected full restoration by 6 PM today.",
  safe: "Based on current data, Baner and Aundh are the safest zones in Pune right now—no active alerts, low flood risk (12-18%), and minimal traffic congestion (19-22%). If you need to travel, routes through these areas should be unaffected.",
  general: "I'm analyzing current city conditions for you. Pune currently has 4 zones with active alerts: Shivajinagar and Hadapsar are in critical status, while Kothrud and Hinjewadi have warnings. The primary concerns are waterlogging, traffic congestion, and localized power outages. Would you like details about a specific area or issue?"
};

function generateChatResponse(query) {
  const q = query.toLowerCase();
  if (q.includes("flood") || q.includes("water") || q.includes("rain") || q.includes("waterlog")) return CHATBOT_RESPONSES.flood;
  if (q.includes("traffic") || q.includes("congestion") || q.includes("jam") || q.includes("road")) return CHATBOT_RESPONSES.traffic;
  if (q.includes("route") || q.includes("direction") || q.includes("navigate") || q.includes("travel") || q.includes("commute")) return CHATBOT_RESPONSES.route;
  if (q.includes("weather") || q.includes("forecast") || q.includes("temperature") || q.includes("climate")) return CHATBOT_RESPONSES.weather;
  if (q.includes("power") || q.includes("electricity") || q.includes("outage") || q.includes("light")) return CHATBOT_RESPONSES.power;
  if (q.includes("safe") || q.includes("best") || q.includes("clear") || q.includes("okay") || q.includes("fine")) return CHATBOT_RESPONSES.safe;
  return CHATBOT_RESPONSES.general;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
const riskColor = { critical: "#ef4444", warning: "#f59e0b", safe: "#22c55e" };
const riskBg = { critical: "rgba(239,68,68,0.1)", warning: "rgba(245,158,11,0.1)", safe: "rgba(34,197,94,0.1)" };

const problemIconMap = {
  waterlogging: Icons.cloudRain,
  traffic: Icons.road,
  power: Icons.zap,
  pothole: Icons.alertTriangle,
  water: Icons.droplets,
  construction: Icons.construction,
  garbage: Icons.alertTriangle,
};

const typeIconMap = {
  road: Icons.road,
  building: Icons.building,
  junction: Icons.gitFork,
  area: Icons.mapPin,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getNextDays(count) {
  const days = [];
  const now = new Date();
  for (let i = 0; i <= count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push({
      value: i,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return days;
}

function getTimeSlots() {
  const slots = [{ value: "now", label: "Current Time" }];
  for (let h = 0; h < 24; h += 2) {
    slots.push({ value: h, label: `${String(h).padStart(2, "0")}:00` });
  }
  return slots;
}



const alertIconMap = {
  droplets: Icons.droplets,
  construction: Icons.construction,
  zap: Icons.zap,
  cloudRain: Icons.cloudRain,
  road: Icons.road,
};

// ── Main App ───────────────────────────────────────────────────────────────────
export default function NeuroCityApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem("nc-theme") || "light");

  // ── Auth state (persisted in localStorage) ──
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("nc-token"));
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nc-user") || "null"); } catch { return null; }
  });
  const userName = currentUser?.name || "User";
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ── Auth form state ──
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── Info modals ──
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const [chatMode, setChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [selectedZone, setSelectedZone] = useState(null);
  const [detailZone, setDetailZone] = useState(null);
  const [forecastDay, setForecastDay] = useState(0);
  const [forecastTime, setForecastTime] = useState("now");

  // Cascade simulator state
  const [cascadeRain, setCascadeRain] = useState(72);
  const [cascadeWaterlog, setCascadeWaterlog] = useState(55);
  const [cascadePower, setCascadePower] = useState(40);
  const [cascadeConstruction, setCascadeConstruction] = useState(30);
  const [cascadePipe, setCascadePipe] = useState(25);
  const [simRun, setSimRun] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // ── Live backend state ──────────────────────────────────────────────────
  const [forecastData, setForecastData] = useState(null);
  const [liveZones, setLiveZones] = useState(ZONES);
  const [liveAlerts, setLiveAlerts] = useState(null);
  const [liveCityNews, setLiveCityNews] = useState(null);
  const [liveWeatherSlogan, setLiveWeatherSlogan] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null); // null=unknown, true, false
  const [forecastLoading, setForecastLoading] = useState(false);

  const [placeholder] = useState(() => SEARCH_PLACEHOLDERS[Math.floor(Math.random() * SEARCH_PLACEHOLDERS.length)]);
  const [weatherSlogan] = useState(() => WEATHER_SLOGANS[Math.floor(Math.random() * WEATHER_SLOGANS.length)]);
  const searchInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nc-theme", theme);
  }, [theme]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // ── Auto-refresh live backend data every 5 minutes ───────────────────────
  const loadLiveData = useCallback(async () => {
    setForecastLoading(true);
    try {
      const [forecast, alertsData, weatherData] = await Promise.all([
        fetchForecast(PUNE_LAT, PUNE_LON, 24, 25),
        fetchAlerts(PUNE_LAT, PUNE_LON, 24),
        fetchWeather(PUNE_LAT, PUNE_LON, 1),
      ]);

      setForecastData(forecast);
      setBackendOnline(true);

      // Map backend data → UI shapes (fallback to static if empty)
      const zones = mapForecastToZones(forecast, ZONES);
      setLiveZones(zones);

      const alerts = mapAlertsToLocalAlerts(alertsData);
      if (alerts) setLiveAlerts(alerts);

      const timeline = mapIncidentsToTimeline(forecast);
      if (timeline) setLiveTimeline(timeline);

      const cityNews = mapRemediesToCityNews(forecast);
      if (cityNews) setLiveCityNews(cityNews);

      const slogan = buildWeatherSlogan(weatherData);
      if (slogan) setLiveWeatherSlogan(slogan);
    } catch (err) {
      console.warn("[NeuroCity] Backend unavailable:", err.message);
      setBackendOnline(false);
    } finally {
      setForecastLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveData();
    const timer = setInterval(loadLiveData, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(timer);
  }, [loadLiveData]);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  const handleZoneSelect = useCallback((zoneId) => {
    if (zoneId === null) {
      setDetailZone(null);
      setSelectedZone(null);
    } else {
      setSelectedZone(zoneId);
      // Use liveZones so the detail panel reflects live backend data
      const z = liveZones.find(z => z.id === zoneId);
      if (z && z.problems.length > 0) setDetailZone(z);
      else setDetailZone(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveZones]);

  // ── Chat logic — calls backend /chat, falls back to local ──
  const sendBotResponse = useCallback(async (userQuery) => {
    setIsTyping(true);
    try {
      // Build live city context to enrich AI replies
      const hrs = forecastData?.timeline || [];
      const getMax = k => Math.max(...hrs.map(h => h.risk_scores?.[k] ?? 0), 0);
      const context = forecastData ? {
        overall_risk: getMax("overall"),
        flood_risk:   getMax("flood"),
        congestion:   getMax("congestion"),
        weather_slogan: liveWeatherSlogan,
        active_alerts: (forecastData.alerts || []).map(a => a.description),
      } : null;

      const data = await sendChatMessage(userQuery, context);
      setChatMessages(prev => [...prev, {
        role: "bot",
        text: data.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } catch {
      // Fallback: use local logic if backend is unavailable
      const text = buildLiveChatResponse(userQuery, forecastData, liveWeatherSlogan)
        || generateChatResponse(userQuery);
      setChatMessages(prev => [...prev, {
        role: "bot",
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [forecastData, liveWeatherSlogan]);

  const handleSearch = () => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    const q = searchInputRef.current?.value?.trim();
    if (!q) return;
    setChatMode(true);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages([{ role: "user", text: q, time: now }]);
    searchInputRef.current.value = "";
    setTimeout(() => sendBotResponse(q), 300);
  };

  const handleChatSend = () => {
    if (!chatInput.trim() || isTyping) return;
    const userMsg = chatInput.trim();
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages(prev => [...prev, { role: "user", text: userMsg, time: now }]);
    setChatInput("");
    sendBotResponse(userMsg);
  };

  const handleForecastChange = (setter) => (e) => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    setter(e.target.value);
  };

  /**
   * handleAuthSubmit — handles both Login and Signup.
   * Calls backend, stores JWT + user in localStorage, sets app auth state.
   */
  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const data = authMode === "login"
        ? await loginUser(authEmail, authPassword)
        : await signupUser(authName, authEmail, authPassword);
      // Persist token and user profile
      localStorage.setItem("nc-token", data.token);
      localStorage.setItem("nc-user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      // Reset form
      setAuthEmail(""); setAuthPassword(""); setAuthName(""); setAuthError("");
    } catch (err) {
      setAuthError(err.message || "Authentication failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("nc-token");
    localStorage.removeItem("nc-user");
    setCurrentUser(null);
    setIsLoggedIn(false);
    setChatMode(false);
    setChatMessages([]);
  }

  function runSim() {
    setSimRun(true);
    const hrs = forecastData?.timeline || [];
    const getMax = k => Math.max(...hrs.map(h => h.risk_scores?.[k] ?? 0), 0);
    const liveTraffic = forecastData ? Math.round(getMax("congestion") * 100) : 65;
    const liveWeather = forecastData ? Math.round(getMax("flood") * 100) : cascadeRain;
    const clientResult = {
      floodRisk:         Math.min(98, Math.round(cascadeRain * 0.60 + cascadeWaterlog * 0.30 + cascadePipe * 0.08 + 4)),
      trafficDelay:      Math.min(98, Math.round(liveTraffic * 0.55 + cascadeRain * 0.15 + cascadeConstruction * 0.12 + cascadePipe * 0.08)),
      waterlogging:      Math.min(98, Math.round(cascadeWaterlog * 0.65 + liveWeather * 0.20 + cascadePipe * 0.10 + 5)),
      powerRisk:         Math.min(98, Math.round(cascadePower * 0.70 + cascadeRain * 0.10 + cascadePipe * 0.10 + 5)),
      constructionDelay: Math.min(98, Math.round(cascadeConstruction * 0.75 + cascadeRain * 0.10 + cascadePipe * 0.08 + 3)),
      pipeRisk:          Math.min(98, Math.round(cascadePipe * 0.72 + cascadeRain * 0.15 + cascadeWaterlog * 0.10 + 3)),
      cascadeScore: Math.min(98, Math.round(
        cascadeRain * 0.22 + cascadeWaterlog * 0.18 + liveTraffic * 0.18 +
        cascadePower * 0.13 + cascadeConstruction * 0.10 + cascadePipe * 0.09 + liveWeather * 0.10
      )),
      liveTraffic,
      liveWeather,
    };
    if (forecastData?.summary) {
      const s = forecastData.summary;
      clientResult.liveOverall = Math.round((s.max_risk_score ?? 0) * 100);
      clientResult.liveRedHours = s.red_hours ?? 0;
    }
    setTimeout(() => {
      setSimResult(clientResult);
      setSimRun(false);
    }, 1200);
  }

  const days = getNextDays(5);
  const timeSlots = getTimeSlots();
  const greeting = getGreeting();

  return (
    <div className="neurocity-app">

      {/* ═══ HEADER ═══ */}
      <header className="nc-header">
        <div className="nc-header-left">
          <div className="nc-logo">{Icons.brain({ size: 20, color: "white" })}</div>
          <span className="nc-brand"><span className="nc-brand-accent">Neuro</span>City</span>
        </div>
        <div className="nc-header-right">
          <button className="nc-theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            <div className={`nc-theme-toggle-knob ${theme === "dark" ? "dark" : ""}`}>
              {theme === "light" ? Icons.sun({ size: 12, color: "white" }) : Icons.moon({ size: 12, color: "white" })}
            </div>
          </button>
          {isLoggedIn ? (
            <div className="nc-user-pill">
              <div className="nc-user-avatar">{userName[0]}</div>
              <span>{userName}</span>
              <button className="nc-logout-btn" onClick={handleLogout} title="Logout">
                {Icons.logOut({ size: 14 })}
              </button>
            </div>
          ) : (
            <button className="nc-login-btn" onClick={() => setShowLoginModal(true)}>Login / Signup</button>
          )}
        </div>
      </header>

      <div className="neurocity-container">

        {/* ═══ GREETING ═══ */}
        <section className="nc-greeting-section">
          <h1 className="nc-greeting-text">
            {greeting}{isLoggedIn ? <>, <span className="nc-greeting-accent">{userName}!</span></> : "!"}
          </h1>
          <p className="nc-weather-slogan">
            {Icons.cloudRain({ size: 18 })}
            {liveWeatherSlogan || weatherSlogan}
            {backendOnline === true && (
              <span className="nc-live-badge">● LIVE</span>
            )}
          </p>
        </section>

        {/* ═══ SEARCH BAR / CHATBOT ═══ */}
        {!chatMode ? (
          <section className="nc-search-section">
            <div className="nc-search-wrapper" onClick={() => { if (!isLoggedIn) setShowLoginModal(true); }}>
              <span className="nc-search-icon">{Icons.search({ size: 18 })}</span>
              <input ref={searchInputRef} className="nc-search-input" placeholder={placeholder} disabled={!isLoggedIn} onKeyDown={e => e.key === "Enter" && handleSearch()} />
              <button className="nc-search-btn" onClick={handleSearch}>Search</button>
            </div>
          </section>
        ) : (
          <div className="nc-chat-container">
            <div className="nc-chat-header">
              <span className="nc-chat-title">{Icons.bot({ size: 18 })} NeuroCity Assistant</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="nc-chat-status">{isTyping ? "Thinking..." : "Online"}</span>
                <button className="nc-chat-close" onClick={() => { setChatMode(false); setChatMessages([]); }}>{Icons.x({ size: 18 })}</button>
              </div>
            </div>
            <div className="nc-chat-messages">
              {chatMessages.map((m, i) => (
                <div key={i} className={`nc-chat-msg ${m.role}`}>
                  <div className="nc-chat-msg-sender">{m.role === "user" ? "You" : "NeuroCity AI"} · {m.time}</div>
                  <div className="nc-chat-msg-bubble">{m.text}</div>
                </div>
              ))}
              {isTyping && (
                <div className="nc-chat-typing">
                  <div className="nc-chat-typing-dot" />
                  <div className="nc-chat-typing-dot" />
                  <div className="nc-chat-typing-dot" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="nc-chat-input-row">
              <input className="nc-chat-input" placeholder="Ask a follow-up question..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChatSend()} disabled={isTyping} />
              <button className="nc-chat-send" onClick={handleChatSend} disabled={isTyping || !chatInput.trim()}>
                {Icons.send({ size: 14 })} Send
              </button>
            </div>
          </div>
        )}

        {/* ═══ CITY MAP ═══ */}
        <section className="nc-map-section">
          <div className="nc-map-card">
            <div className="nc-map-header">
              <span className="nc-map-label">{Icons.map({ size: 18 })} City Alert Map — {CITY}</span>
              <span className="nc-map-hint">Click an alert zone for details</span>
            </div>
            <div className="nc-map-container">
              <div className="nc-forecast-controls">
                <select className="nc-forecast-select" value={forecastDay} onChange={handleForecastChange(setForecastDay)}>
                  {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <select className="nc-forecast-select" value={forecastTime} onChange={handleForecastChange(setForecastTime)}>
                  {timeSlots.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {forecastLoading && (
                <div className="nc-loading-bar" title="Fetching live data...">Fetching live traffic data…</div>
              )}
              {backendOnline === false && (
                <div className="nc-error-banner">⚠️ Backend offline — showing cached data</div>
              )}
              <LeafletMap zones={liveZones} selectedZone={selectedZone} setSelectedZone={handleZoneSelect} />
            </div>
          </div>
          {selectedZone && (() => {
            const zone = liveZones.find(z => z.id === selectedZone);
            if (!zone) return null;
            return (
              <div className="nc-zone-summary">
                <div className="nc-zone-summary-header">
                  <span className="nc-zone-name">{Icons.mapPin({ size: 14 })} {zone.name}</span>
                  {zone.problems.length > 0 ? (
                    <span className="nc-stat-badge" style={{ color: riskColor[zone.risk], background: riskBg[zone.risk] }}>
                      {zone.problems.length} ACTIVE {zone.problems.length === 1 ? "ALERT" : "ALERTS"}
                    </span>
                  ) : (
                    <span className="nc-stat-badge" style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>ALL CLEAR</span>
                  )}
                </div>
                {zone.problems.length > 0 && (
                  <div className="nc-zone-problems">
                    {zone.problems.map((p, i) => {
                      const PIcon = problemIconMap[p.icon];
                      return (
                        <div key={i} className="nc-zone-problem-tag">
                          {PIcon && PIcon({ size: 13 })}
                          <span style={{ color: "var(--text-secondary)" }}>{p.label}</span>
                          <span style={{ color: p.severity >= 60 ? "#ef4444" : "#f59e0b", fontWeight: 700, fontSize: 10 }}>{p.severity}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* ═══ BOTTOM GRID: Cascade Sim (left tall) + Alerts & News (right stacked) ═══ */}
        <div className="nc-bottom-cascade-grid">

          {/* ── CASCADE SIMULATOR — left tall column ── */}
          <div className="nc-card nc-cascade-card">
            <div className="nc-card-title">{Icons.sliders({ size: 16 })} Cascade Event Simulator</div>
            <p className="nc-cascade-subtitle">Simulate compounding urban events to forecast city-wide impact</p>

            {/* ── Live data read-only badges ── */}
            <div className="nc-cascade-live-row">
              <div className="nc-cascade-live-item">
                <span className="nc-cascade-live-label">{Icons.cloudRain({ size: 13 })} Weather Intensity</span>
                <span className="nc-cascade-live-value nc-live-badge">
                  {forecastData
                    ? `${Math.round(Math.max(...(forecastData.timeline || []).map(h => h.risk_scores?.flood ?? 0), 0) * 100)}%`
                    : "-- %"}
                  {forecastData && <span style={{ marginLeft: 4 }}>● LIVE</span>}
                  {!forecastData && <span style={{ marginLeft: 4, color: "var(--text-muted)" }}>API offline</span>}
                </span>
              </div>
              <div className="nc-cascade-live-item">
                <span className="nc-cascade-live-label">{Icons.road({ size: 13 })} Traffic Load</span>
                <span className="nc-cascade-live-value nc-live-badge">
                  {forecastData
                    ? `${Math.round(Math.max(...(forecastData.timeline || []).map(h => h.risk_scores?.congestion ?? 0), 0) * 100)}%`
                    : "-- %"}
                  {forecastData && <span style={{ marginLeft: 4 }}>● LIVE</span>}
                  {!forecastData && <span style={{ marginLeft: 4, color: "var(--text-muted)" }}>API offline</span>}
                </span>
              </div>
            </div>

            {/* ── Slider parameters ── */}
            <div className="nc-cascade-sliders">
              {[
                { label: "Heavy Rainfall",      val: cascadeRain,         set: setCascadeRain,         icon: "cloudRain",   color: "#3b82f6" },
                { label: "Waterlogging Level",   val: cascadeWaterlog,     set: setCascadeWaterlog,     icon: "droplets",    color: "#06b6d4" },
                { label: "Water Pipe Failure",   val: cascadePipe,         set: setCascadePipe,         icon: "droplets",    color: "#10b981" },
                { label: "Power Outage Risk",    val: cascadePower,        set: setCascadePower,        icon: "zap",         color: "#f59e0b" },
                { label: "Road Construction",    val: cascadeConstruction, set: setCascadeConstruction, icon: "construction",color: "#8b5cf6" },
              ].map(({ label, val, set, icon, color }) => {
                const SliderIcon = Icons[icon];
                return (
                  <div key={label} className="nc-cascade-slider-row">
                    <div className="nc-cascade-slider-header">
                      <span className="nc-cascade-slider-label">
                        {SliderIcon && SliderIcon({ size: 13, color })} {label}
                      </span>
                      <span className="nc-cascade-slider-val" style={{ color }}>{val}%</span>
                    </div>
                    <div className="nc-cascade-track-wrap">
                      <input
                        type="range" min="0" max="100" value={val}
                        onChange={e => set(+e.target.value)}
                        className="nc-sim-slider nc-cascade-slider"
                        style={{ "--thumb-color": color }}
                      />
                      <div className="nc-cascade-fill" style={{ width: `${val}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={runSim} disabled={simRun} className="nc-sim-btn nc-cascade-run-btn">
              {simRun ? "Simulating cascade..." : "Run Cascade Simulation"}
            </button>

            {simResult && (
              <div className="nc-sim-result nc-cascade-result">
                <div className="nc-cascade-result-title">Predicted Impact</div>
                {[
                  ["Flood Risk",          simResult.floodRisk,        "#ef4444"],
                  ["Traffic Delay",       simResult.trafficDelay,     "#f59e0b"],
                  ["Waterlogging",        simResult.waterlogging,     "#06b6d4"],
                  ["Water Pipe Failure",  simResult.pipeRisk,         "#10b981"],
                  ["Power Outage",        simResult.powerRisk,        "#f97316"],
                  ["Construction Impact", simResult.constructionDelay, "#8b5cf6"],
                ].map(([l, v, c]) => (
                  <div key={l} className="nc-cascade-result-row">
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{l}</span>
                    <div className="nc-cascade-result-bar-wrap">
                      <div className="nc-cascade-result-bar" style={{ width: `${v}%`, background: c }} />
                    </div>
                    <span style={{ color: c, fontWeight: 800, fontSize: 12, minWidth: 36, textAlign: "right" }}>{v}%</span>
                  </div>
                ))}
                <div className="nc-cascade-overall">
                  <span>Overall Cascade Score</span>
                  <span style={{ color: simResult.cascadeScore > 65 ? "#ef4444" : simResult.cascadeScore > 40 ? "#f59e0b" : "#22c55e", fontWeight: 900, fontSize: 22 }}>
                    {simResult.cascadeScore}%
                  </span>
                </div>
                {simResult.liveOverall != null && (
                  <div className="nc-cascade-live-risk">
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>LIVE Backend Risk</span>
                    <span style={{ color: simResult.liveOverall > 60 ? "#ef4444" : simResult.liveOverall > 35 ? "#f59e0b" : "#22c55e", fontWeight: 800 }}>
                      {simResult.liveOverall}% · {simResult.liveRedHours}h red-level
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right column: Merged Alerts & News feed ── */}
          <div className="nc-cascade-right">
            <div className="nc-card nc-feed-card">
              <div className="nc-card-title">
                {Icons.bell({ size: 16 })} City Feed
                {(liveAlerts || liveCityNews) && <span className="nc-live-badge">● LIVE</span>}
              </div>
              {/* Alerts section */}
              <div className="nc-feed-section-label">
                {Icons.bell({ size: 11 })} Local Alerts
              </div>
              {(liveAlerts || LOCAL_ALERTS).map((a, i) => {
                const AIcon = alertIconMap[a.iconKey];
                return (
                  <div key={`alert-${i}`} className="nc-alert-item nc-feed-alert">
                    <div className="nc-alert-icon nc-feed-icon-alert">{AIcon && AIcon({ size: 16 })}</div>
                    <div className="nc-alert-content">
                      <div className="nc-alert-title">{a.title}</div>
                      <div className="nc-alert-desc">{a.desc}</div>
                    </div>
                    <span className="nc-alert-time">{a.time}</span>
                  </div>
                );
              })}
              {/* Divider */}
              <div className="nc-feed-divider" />
              {/* News section */}
              <div className="nc-feed-section-label">
                {Icons.newspaper({ size: 11 })} City News
              </div>
              {(liveCityNews || CITY_NEWS).map((n, i) => {
                const NIcon = alertIconMap[n.iconKey];
                return (
                  <div key={`news-${i}`} className="nc-alert-item nc-feed-news">
                    <div className="nc-alert-icon nc-feed-icon-news">{NIcon && NIcon({ size: 16 })}</div>
                    <div className="nc-alert-content">
                      <div className="nc-alert-title">{n.title}</div>
                      <div className="nc-alert-desc">{n.desc}</div>
                    </div>
                    <span className="nc-alert-time">{n.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ CAUSAL GRAPH SECTION ═══ */}
        <section className="nc-causal-section">
          <div className="nc-card nc-causal-card">
            <div className="nc-card-title">{Icons.gitFork({ size: 16 })} Cascade Causal Graph
              <span className="nc-causal-hint">
                {simResult ? "Showing live simulation propagation" : "Run simulation above to activate"}
              </span>
            </div>
            <div className="nc-causal-graph">
              {/* SVG causal graph */}
              <svg className="nc-causal-svg" viewBox="0 0 900 340" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <marker id="arrowBlue"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" /></marker>
                  <marker id="arrowCyan"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#06b6d4" /></marker>
                  <marker id="arrowGreen"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#10b981" /></marker>
                  <marker id="arrowAmber"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#f59e0b" /></marker>
                  <marker id="arrowOrange" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#f97316" /></marker>
                  <marker id="arrowPurple" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#8b5cf6" /></marker>
                  <marker id="arrowRed"    markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#ef4444" /></marker>
                  <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  <filter id="glowHot"><feGaussianBlur stdDeviation="5" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>

                {(() => {
                  const T = "0.65s";
                  // Node values: inputs from sliders, derived from simResult when available
                  const vRain    = cascadeRain;
                  const vPipe    = cascadePipe;
                  const vConstr  = cascadeConstruction;
                  const vWater   = simResult ? simResult.waterlogging : cascadeWaterlog;
                  const vFlood   = simResult ? simResult.floodRisk    : Math.round(cascadeRain * 0.5);
                  const vPower   = simResult ? simResult.powerRisk    : cascadePower;
                  const vTraffic = simResult ? simResult.trafficDelay : Math.round(cascadeRain * 0.3 + cascadeConstruction * 0.3);
                  const vEmerg   = simResult ? simResult.cascadeScore : 0;
                  // Helpers
                  const ac  = (v, b) => v >= 70 ? "#ef4444" : v >= 42 ? "#f59e0b" : b;
                  const fop = v => parseFloat((0.08 + (v/100)*0.37).toFixed(2));
                  const ew  = v => parseFloat((1   + (v/100)*4).toFixed(1));
                  const eo  = v => parseFloat((0.25+ (v/100)*0.75).toFixed(2));
                  const sw  = v => v >= 65 ? 2.5 : 1.5;
                  const gf  = v => v >= 55 ? "url(#glowHot)" : "url(#glow)";
                  const lb  = v => `${Math.round(v)}%`;
                  return (<>
                    {/* ─── EDGES — paths start/end at exact box edges ─── */}

                    {/* Rain(right:142,80) → Waterlogging(left:298,136)
                        Exits Rain going right, enters Waterlogging from the left */}
                    <path d="M 142,80 C 200,80 240,136 298,136"
                      fill="none" stroke="#3b82f6" strokeWidth={ew(vRain)} strokeDasharray="5,3"
                      markerEnd="url(#arrowBlue)" opacity={eo(vRain)} style={{transition:`all ${T}`}} />

                    {/* Rain(bottom:80,108) → Flood(left:298,266)
                        Exits Rain downward, swings left clear of Pipe node, enters Flood from left */}
                    <path d="M 80,108 C 80,180 298,200 298,266"
                      fill="none" stroke="#3b82f6" strokeWidth={ew(vRain)} strokeDasharray="5,3"
                      markerEnd="url(#arrowBlue)" opacity={eo(vRain)} style={{transition:`all ${T}`}} />

                    {/* Rain(top:80,54) → Traffic(left:558,86)
                        Exits Rain from top, arcs high above everything, enters Traffic from left */}
                    <path d="M 80,54 C 80,20 470,20 558,86"
                      fill="none" stroke="#3b82f6" strokeWidth={ew(vRain)} strokeDasharray="5,3"
                      markerEnd="url(#arrowBlue)" opacity={eo(vRain)} style={{transition:`all ${T}`}} />

                    {/* Waterlogging(bottom:365,164) → Flood(top:365,238)
                        Exits bottom, gentle S down into top of Flood */}
                    <path d="M 365,164 C 340,195 390,210 365,238"
                      fill="none" stroke="#06b6d4" strokeWidth={ew(vWater)} strokeDasharray="5,3"
                      markerEnd="url(#arrowCyan)" opacity={eo(vWater)} style={{transition:`all ${T}`}} />

                    {/* Waterlogging(right:432,136) → Traffic(left:558,86)
                        Exits right, curves up to enter Traffic left edge cleanly */}
                    <path d="M 432,136 C 490,136 510,86 558,86"
                      fill="none" stroke="#06b6d4" strokeWidth={ew(vWater)} strokeDasharray="5,3"
                      markerEnd="url(#arrowCyan)" opacity={eo(vWater)} style={{transition:`all ${T}`}} />

                    {/* Pipe(right:142,200) → Waterlogging(left:298,136)
                        Exits right, curves up without crossing Rain's path */}
                    <path d="M 142,200 C 210,200 250,136 298,136"
                      fill="none" stroke="#10b981" strokeWidth={ew(vPipe)} strokeDasharray="5,3"
                      markerEnd="url(#arrowGreen)" opacity={eo(vPipe)} style={{transition:`all ${T}`}} />

                    {/* Pipe(right:142,210) → Power(left:558,201)
                        Exits right, bows below Waterlogging & Flood nodes, enters Power from left */}
                    <path d="M 142,210 C 300,252 420,252 558,201"
                      fill="none" stroke="#10b981" strokeWidth={ew(vPipe)} strokeDasharray="5,3"
                      markerEnd="url(#arrowGreen)" opacity={eo(vPipe)} style={{transition:`all ${T}`}} />

                    {/* Power(top:625,173) → Traffic(bottom:630,114)
                        Direct arcing up from top of Power to bottom of Traffic */}
                    <path d="M 618,173 C 600,148 608,132 622,114"
                      fill="none" stroke="#f59e0b" strokeWidth={ew(vPower)} strokeDasharray="5,3"
                      markerEnd="url(#arrowAmber)" opacity={eo(vPower)} style={{transition:`all ${T}`}} />

                    {/* Constr(top:80,269) → Traffic(bottom:600,114)
                        Exits top, sweeps right staying below Rain then arcs up to Traffic bottom */}
                    <path d="M 80,269 C 80,235 420,235 555,114"
                      fill="none" stroke="#8b5cf6" strokeWidth={ew(vConstr)} strokeDasharray="5,3"
                      markerEnd="url(#arrowPurple)" opacity={eo(vConstr)} style={{transition:`all ${T}`}} />

                    {/* Traffic(right:702,86) → Emergency(left:778,176)
                        Exits Traffic right, curves down to enter Emergency left */}
                    <path d="M 702,86 C 748,86 778,140 778,176"
                      fill="none" stroke="#f97316" strokeWidth={ew(vTraffic)}
                      markerEnd="url(#arrowOrange)" opacity={eo(vTraffic)} style={{transition:`all ${T}`}} />

                    {/* Flood(right:432,266) → Emergency(left:778,176)
                        Exits right, curves smoothly up to Emergency left edge */}
                    <path d="M 432,266 C 580,266 778,240 778,210"
                      fill="none" stroke="#ef4444" strokeWidth={ew(vFlood)}
                      markerEnd="url(#arrowRed)" opacity={eo(vFlood)} style={{transition:`all ${T}`}} />
                    {/* Root nodes */}
                    <g filter={gf(vRain)} style={{transition:`all ${T}`}}>
                      <rect x="20" y="54" width="120" height="52" rx="12" fill={ac(vRain,"#3b82f6")} fillOpacity={fop(vRain)} stroke={ac(vRain,"#3b82f6")} strokeWidth={sw(vRain)} style={{transition:`all ${T}`}} />
                      <text x="80" y="73" textAnchor="middle" fontSize="10" fontWeight="700" fill={ac(vRain,"#3b82f6")}>Heavy Rainfall</text>
                      <text x="80" y="94" textAnchor="middle" fontSize="15" fontWeight="900" fill={ac(vRain,"#3b82f6")}>{lb(vRain)}</text>
                    </g>
                    <g filter={gf(vPipe)} style={{transition:`all ${T}`}}>
                      <rect x="20" y="174" width="120" height="52" rx="12" fill={ac(vPipe,"#10b981")} fillOpacity={fop(vPipe)} stroke={ac(vPipe,"#10b981")} strokeWidth={sw(vPipe)} style={{transition:`all ${T}`}} />
                      <text x="80" y="193" textAnchor="middle" fontSize="10" fontWeight="700" fill={ac(vPipe,"#10b981")}>Pipe Failure</text>
                      <text x="80" y="214" textAnchor="middle" fontSize="15" fontWeight="900" fill={ac(vPipe,"#10b981")}>{lb(vPipe)}</text>
                    </g>
                    <g filter={gf(vConstr)} style={{transition:`all ${T}`}}>
                      <rect x="20" y="269" width="120" height="52" rx="12" fill={ac(vConstr,"#8b5cf6")} fillOpacity={fop(vConstr)} stroke={ac(vConstr,"#8b5cf6")} strokeWidth={sw(vConstr)} style={{transition:`all ${T}`}} />
                      <text x="80" y="288" textAnchor="middle" fontSize="10" fontWeight="700" fill={ac(vConstr,"#8b5cf6")}>Road Constr.</text>
                      <text x="80" y="309" textAnchor="middle" fontSize="15" fontWeight="900" fill={ac(vConstr,"#8b5cf6")}>{lb(vConstr)}</text>
                    </g>
                    {/* Intermediate nodes */}
                    <g filter={gf(vWater)} style={{transition:`all ${T}`}}>
                      <rect x="300" y="110" width="130" height="52" rx="12" fill={ac(vWater,"#06b6d4")} fillOpacity={fop(vWater)} stroke={ac(vWater,"#06b6d4")} strokeWidth={sw(vWater)} style={{transition:`all ${T}`}} />
                      <text x="365" y="129" textAnchor="middle" fontSize="10" fontWeight="700" fill={ac(vWater,"#06b6d4")}>Waterlogging</text>
                      <text x="365" y="150" textAnchor="middle" fontSize="15" fontWeight="900" fill={ac(vWater,"#06b6d4")}>{lb(vWater)}</text>
                    </g>
                    <g filter={gf(vFlood)} style={{transition:`all ${T}`}}>
                      <rect x="300" y="240" width="130" height="52" rx="12" fill={ac(vFlood,"#ef4444")} fillOpacity={fop(vFlood)} stroke={ac(vFlood,"#ef4444")} strokeWidth={sw(vFlood)} style={{transition:`all ${T}`}} />
                      <text x="365" y="259" textAnchor="middle" fontSize="10" fontWeight="700" fill={ac(vFlood,"#ef4444")}>Flood Risk</text>
                      <text x="365" y="280" textAnchor="middle" fontSize="15" fontWeight="900" fill={ac(vFlood,"#ef4444")}>{lb(vFlood)}</text>
                    </g>
                    <g filter={gf(vPower)} style={{transition:`all ${T}`}}>
                      <rect x="560" y="175" width="130" height="52" rx="12" fill={ac(vPower,"#f59e0b")} fillOpacity={fop(vPower)} stroke={ac(vPower,"#f59e0b")} strokeWidth={sw(vPower)} style={{transition:`all ${T}`}} />
                      <text x="625" y="194" textAnchor="middle" fontSize="10" fontWeight="700" fill={ac(vPower,"#f59e0b")}>Power Outage</text>
                      <text x="625" y="215" textAnchor="middle" fontSize="15" fontWeight="900" fill={ac(vPower,"#f59e0b")}>{lb(vPower)}</text>
                    </g>
                    {/* Traffic hub */}
                    <g filter={gf(vTraffic)} style={{transition:`all ${T}`}}>
                      <rect x="560" y="60" width="140" height="52" rx="12" fill={ac(vTraffic,"#f97316")} fillOpacity={fop(vTraffic)} stroke={ac(vTraffic,"#f97316")} strokeWidth={sw(vTraffic)+0.5} style={{transition:`all ${T}`}} />
                      <text x="630" y="79"  textAnchor="middle" fontSize="10" fontWeight="800" fill={ac(vTraffic,"#f97316")}>Traffic Congestion</text>
                      <text x="630" y="100" textAnchor="middle" fontSize="15" fontWeight="900" fill={ac(vTraffic,"#f97316")}>{lb(vTraffic)}</text>
                    </g>
                    {/* Emergency outcome */}
                    <g filter={gf(vEmerg)} style={{transition:`all ${T}`}}>
                      <rect x="780" y="142" width="110" height="68" rx="14" fill={ac(vEmerg,"#ef4444")} fillOpacity={simResult ? fop(vEmerg) : 0.08} stroke={ac(vEmerg,"#ef4444")} strokeWidth={simResult ? sw(vEmerg)+0.5 : 2} style={{transition:`all ${T}`}} />
                      <text x="835" y="163" textAnchor="middle" fontSize="10" fontWeight="800" fill={ac(vEmerg,"#ef4444")}>Emergency</text>
                      <text x="835" y="177" textAnchor="middle" fontSize="10" fontWeight="800" fill={ac(vEmerg,"#ef4444")}>Impact</text>
                      <text x="835" y="198" textAnchor="middle" fontSize="16" fontWeight="900" fill={ac(vEmerg,"#ef4444")}>{simResult ? lb(vEmerg) : "--"}</text>
                    </g>
                    {!simResult && (
                      <text x="450" y="334" textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontStyle="italic">
                        Adjust sliders and run the simulation to see live propagation
                      </text>
                    )}
                  </>);
                })()}
              </svg>

              {/* Legend */}
              <div className="nc-causal-legend">
                {[
                  ["#3b82f6", "Heavy Rainfall"],
                  ["#06b6d4", "Waterlogging"],
                  ["#10b981", "Water Pipe Failure"],
                  ["#f59e0b", "Power Outage"],
                  ["#8b5cf6", "Road Construction"],
                  ["#f97316", "Traffic Congestion"],
                  ["#ef4444", "Flood / Emergency"],
                ].map(([c, l]) => (
                  <div key={l} className="nc-causal-legend-item">
                    <span className="nc-causal-legend-dot" style={{ background: c }} />
                    <span>{l}</span>
                  </div>
                ))}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
                  <span style={{ fontSize:10, color:"var(--text-muted)" }}>Intensity:</span>
                  {[["Low","#22c55e"],["Med","#f59e0b"],["High","#ef4444"]].map(([t,c]) => (
                    <span key={t} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, fontWeight:700, color:c }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block" }} />{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="nc-footer">
        <div className="nc-footer-links">
          <button className="nc-footer-btn" onClick={() => setShowAboutModal(true)}>About Us</button>
          <button className="nc-footer-btn" onClick={() => setShowAboutModal(true)}>Our Team</button>
          <button className="nc-footer-btn" onClick={() => setShowContactModal(true)}>Contact / Support</button>
        </div>
        <div className="nc-footer-love">Made with Love ❤️ by SegFaultSquad.</div>
      </footer>

      {/* ═══ SLIDING DETAIL PANEL ═══ */}
      <div className={`nc-detail-overlay ${detailZone ? "open" : ""}`}>
        <div className="nc-detail-backdrop" onClick={() => { setDetailZone(null); setSelectedZone(null); }} />
        {detailZone && (
          <div className="nc-detail-panel">
            <button className="nc-detail-close" onClick={() => { setDetailZone(null); setSelectedZone(null); }}>{Icons.x({ size: 16 })}</button>
            <div className="nc-detail-zone-name">{detailZone.name}</div>
            <div className="nc-detail-zone-badge" style={{ color: riskColor[detailZone.risk], background: riskBg[detailZone.risk] }}>
              {detailZone.risk.toUpperCase()} ZONE
            </div>

            {detailZone.problems.map((p, pi) => {
              const PIcon = problemIconMap[p.icon];
              return (
                <div key={pi} className="nc-detail-problem-card">
                  <div className="nc-detail-problem-header">
                    <span className="nc-detail-problem-label">
                      {PIcon && PIcon({ size: 18 })} {p.label}
                    </span>
                    <span className="nc-detail-severity-badge" style={{ color: p.severity >= 60 ? "#ef4444" : "#f59e0b", background: p.severity >= 60 ? riskBg.critical : riskBg.warning }}>
                      {p.severity}%
                    </span>
                  </div>
                  {p.affected && p.affected.map((a, ai) => {
                    const TIcon = typeIconMap[a.type];
                    return (
                      <div key={ai} className="nc-detail-affected-item">
                        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{TIcon && TIcon({ size: 16 })}</span>
                        <div>
                          <div className="nc-detail-affected-name">{a.name}</div>
                          <div className="nc-detail-affected-desc">{a.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="nc-detail-meta">
              <div className="nc-detail-meta-row">
                <span className="nc-detail-meta-label">Area</span>
                <span className="nc-detail-meta-value">{detailZone.name}, {CITY}</span>
              </div>
              <div className="nc-detail-meta-row">
                <span className="nc-detail-meta-label">Active Issues</span>
                <span className="nc-detail-meta-value">{detailZone.problems.length}</span>
              </div>
              <div className="nc-detail-meta-row">
                <span className="nc-detail-meta-label">Severity</span>
                <span className="nc-detail-meta-value" style={{ color: riskColor[detailZone.risk] }}>{detailZone.risk.toUpperCase()}</span>
              </div>
              {detailZone.problems[0]?.estResolution && (
                <div className="nc-detail-meta-row">
                  <span className="nc-detail-meta-label">Est. Resolution</span>
                  <span className="nc-detail-meta-value">{detailZone.problems[0].estResolution}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ LOGIN / SIGNUP MODAL ═══ */}
      {showLoginModal && (
        <div className="nc-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowLoginModal(false); }}>
          <div className="nc-modal nc-auth-modal">
            <div className="nc-modal-icon">{Icons.user({ size: 28, color: "white" })}</div>

            {/* Tab toggle */}
            <div className="nc-auth-tabs">
              <button className={`nc-auth-tab ${authMode === "login" ? "active" : ""}`} onClick={() => { setAuthMode("login"); setAuthError(""); }}>Login</button>
              <button className={`nc-auth-tab ${authMode === "signup" ? "active" : ""}`} onClick={() => { setAuthMode("signup"); setAuthError(""); }}>Sign Up</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="nc-auth-form">
              {authMode === "signup" && (
                <input className="nc-auth-input" type="text" placeholder="Full Name" value={authName}
                  onChange={e => setAuthName(e.target.value)} required minLength={2} />
              )}
              <input className="nc-auth-input" type="email" placeholder="Email address" value={authEmail}
                onChange={e => setAuthEmail(e.target.value)} required />
              <input className="nc-auth-input" type="password" placeholder="Password (min 6 chars)" value={authPassword}
                onChange={e => setAuthPassword(e.target.value)} required minLength={6} />
              {authError && <div className="nc-auth-error">{authError}</div>}
              <button type="submit" className="nc-modal-btn-primary" disabled={authLoading}>
                {authLoading ? "Please wait…" : authMode === "login" ? "Login" : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ ABOUT US MODAL ═══ */}
      {showAboutModal && (
        <div className="nc-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAboutModal(false); }}>
          <div className="nc-modal nc-info-modal">
            <button className="nc-info-close" onClick={() => setShowAboutModal(false)}>{Icons.x({ size: 16 })}</button>
            <div className="nc-modal-icon">{Icons.brain({ size: 28, color: "white" })}</div>
            <div className="nc-modal-title">About NeuroCity</div>
            <div className="nc-modal-message">AI-powered urban intelligence platform for real-time city monitoring, traffic management, and early warning systems.</div>
            <div className="nc-about-team-label">Team Name</div>
            <div className="nc-about-team-name">SegFaultSquad</div>
            <div className="nc-about-members">
              {["Moksh Suthar", "Sairaj Thorat", "Arya Gaikwad", "Omkar Gaikwad"].map(name => (
                <div key={name} className="nc-about-member">
                  <div className="nc-about-avatar">{name[0]}</div>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONTACT / SUPPORT MODAL ═══ */}
      {showContactModal && (
        <div className="nc-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowContactModal(false); }}>
          <div className="nc-modal nc-info-modal">
            <button className="nc-info-close" onClick={() => setShowContactModal(false)}>{Icons.x({ size: 16 })}</button>
            <div className="nc-modal-icon">{Icons.bell({ size: 28, color: "white" })}</div>
            <div className="nc-modal-title">Contact & Support</div>
            <div className="nc-modal-message">We're here to help around the clock.</div>
            <div className="nc-contact-list">
              {[
                { label: "Phone", value: "+91 98765 43210" },
                { label: "Email", value: "support@neurocity.ai" },
                { label: "Hours", value: "24 × 7 Emergency Support" },
                { label: "Address", value: "Pune, Maharashtra, India" },
              ].map(({ label, value }) => (
                <div key={label} className="nc-contact-row">
                  <span className="nc-contact-label">{label}</span>
                  <span className="nc-contact-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}