/**
 * api.js
 * ------
 * Service layer for the NeuroCity FastAPI backend.
 * All functions return parsed JSON or throw an Error with a human-readable message.
 *
 * Endpoints used:
 *   GET  /forecast, /forecast/weather, /forecast/alerts
 *   POST /auth/signup, /auth/login
 *   GET  /auth/me
 *   POST /chat
 */

// ── Base URL (empty = use CRA proxy → localhost:8000) ──────────────────────
const BASE_URL = "https://neurocityai.onrender.com";

export const PUNE_LAT = 18.5362;
export const PUNE_LON = 73.8478;
export const DEFAULT_HOURS = 24;
export const DEFAULT_RADIUS_KM = 25;

// ── Generic fetch helper ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("nc-token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(BASE_URL + path, { ...options, headers });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// Forecast Endpoints
// ═══════════════════════════════════════════════════════════════════════════

export const fetchForecast = (lat = PUNE_LAT, lon = PUNE_LON, hours = DEFAULT_HOURS, radiusKm = DEFAULT_RADIUS_KM) =>
  apiFetch(`/forecast?lat=${lat}&lon=${lon}&hours=${hours}&radius_km=${radiusKm}`);

export const fetchWeather = (lat = PUNE_LAT, lon = PUNE_LON, hours = DEFAULT_HOURS) =>
  apiFetch(`/forecast/weather?lat=${lat}&lon=${lon}&hours=${hours}`);

export const fetchAlerts = (lat = PUNE_LAT, lon = PUNE_LON, hours = DEFAULT_HOURS) =>
  apiFetch(`/forecast/alerts?lat=${lat}&lon=${lon}&hours=${hours}`);

// ═══════════════════════════════════════════════════════════════════════════
// Auth Endpoints
// ═══════════════════════════════════════════════════════════════════════════

/** Register a new account. Returns { token, user } */
export function signupUser(full_name, email, password) {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ full_name, email, password }),
  });
}

/** Login with credentials. Returns { token, user } */
export function loginUser(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** Validate the stored JWT and return the user profile. */
export function getMe() {
  return apiFetch("/auth/me");
}

// ═══════════════════════════════════════════════════════════════════════════
// Chat Endpoint
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a chat message to the NeuroCity AI backend.
 * @param {string} message
 * @param {object|null} context - optional live city data for richer replies
 * @returns {Promise<{reply: string, model: string}>}
 */
export function sendChatMessage(message, context = null) {
  return apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify({ message, context }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Data Mappers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert a TrafficForecastResponse into the ZONES array shape.
 * Distributes risk scores across all 6 Pune zones intelligently:
 *   - Zones 1 (Shivajinagar) & 5 (Hadapsar): flood + traffic prone → highest risk
 *   - Zone  3 (Hinjewadi): traffic-heavy IT corridor
 *   - Zone  2 (Kothrud): moderate, infrastructure issues
 *   - Zones 4 (Baner) & 6 (Aundh): generally safer, buffer zones
 */
export function mapForecastToZones(forecast, staticZones) {
  if (!forecast?.timeline?.length) return staticZones;

  const hrs = forecast.timeline;
  const maxFlood = Math.max(...hrs.map(h => h.risk_scores?.flood ?? 0), 0);
  const maxCongestion = Math.max(...hrs.map(h => h.risk_scores?.congestion ?? 0), 0);
  const maxPower = Math.max(...hrs.map(h => h.risk_scores?.power_outage ?? 0), 0);
  const maxOverall = Math.max(...hrs.map(h => h.risk_scores?.overall ?? 0), 0);
  const incidents = forecast.active_incidents || [];

  /** Build a risk level string from a 0-1 score. */
  const level = s => s > 0.65 ? "critical" : s > 0.35 ? "warning" : "safe";
  /** Map risk level to hex color. */
  const color = r => r === "critical" ? "#ef4444" : r === "warning" ? "#facc15" : "#22c55e";

  /** Build a problem array proportional to the given flood/traffic factors. */
  const buildProblems = (floodFactor, trafficFactor, powerFactor) => {
    const probs = [];
    const fScore = Math.round(Math.min(maxFlood * floodFactor, 1) * 100);
    const tScore = Math.round(Math.min(maxCongestion * trafficFactor, 1) * 100);
    const pScore = Math.round(Math.min(maxPower * powerFactor, 1) * 100);
    const affectedRoads = incidents.slice(0, 2).map(i => ({
      type: "road",
      name: i.short_desc || "Affected road",
      detail: i.full_desc || (i.delay_seconds ? `Delay ~${Math.round(i.delay_seconds / 60)} min` : "Active incident"),
    }));

    if (fScore > 20) probs.push({
      icon: "waterlogging", label: "Flood Risk", severity: fScore,
      estResolution: fScore > 60 ? "4-6 hours" : "1-3 hours",
      affected: affectedRoads.length ? affectedRoads : [],
    });
    if (tScore > 20) probs.push({
      icon: "traffic", label: "Traffic Congestion", severity: tScore,
      estResolution: tScore > 60 ? "3-4 hours" : "1-2 hours",
      affected: affectedRoads.length ? affectedRoads : [],
    });
    if (pScore > 20) probs.push({
      icon: "power", label: "Power Outage Risk", severity: pScore,
      estResolution: "30-90 min", affected: [],
    });
    return probs;
  };

  // Per-zone risk distribution weights [floodFactor, trafficFactor, powerFactor]
  const ZONE_WEIGHTS = {
    1: [1.0, 0.8, 0.7],   // Shivajinagar — flood + traffic + power
    2: [0.5, 0.5, 0.6],   // Kothrud — moderate across the board
    3: [0.3, 1.0, 0.5],   // Hinjewadi — traffic-dominant (IT corridor)
    4: [0.2, 0.2, 0.2],   // Baner — buffer zone, lowest risk
    5: [0.9, 0.9, 0.5],   // Hadapsar — flood + heavy traffic
    6: [0.15, 0.25, 0.3],  // Aundh — relatively safe
  };

  return staticZones.map(z => {
    const [ff, tf, pf] = ZONE_WEIGHTS[z.id] || [0.3, 0.3, 0.3];
    const problems = buildProblems(ff, tf, pf);
    const zoneRisk = problems.length
      ? level(Math.max(maxFlood * ff, maxCongestion * tf, maxPower * pf))
      : "safe";
    return {
      ...z,
      risk: problems.length ? zoneRisk : "safe",
      flood: Math.round(maxFlood * ff * 100),
      traffic: Math.round(maxCongestion * tf * 100),
      color: color(problems.length ? zoneRisk : "safe"),
      problems: problems.length ? problems : [],
    };
  });
}

/** Build a human-readable weather slogan from the first forecast hour. */
export function buildWeatherSlogan(weather) {
  if (!weather?.hours?.length) return null;
  const h = weather.hours[0];
  const temp = h.temperature_c != null ? `${Math.round(h.temperature_c)}°C` : "";
  const rain = h.precipitation_mm > 0 ? `${h.precipitation_mm.toFixed(1)}mm rain` : "";
  const wind = h.wind_speed_kmh > 20 ? `winds ${Math.round(h.wind_speed_kmh)} km/h` : "";
  const parts = [temp, rain, wind].filter(Boolean);

  const code = h.weather_code ?? 0;
  const condition =
    code >= 95 ? "Thunderstorm" :
      code >= 80 ? "Heavy showers" :
        code >= 61 ? "Rainy conditions" :
          code >= 51 ? "Drizzle" :
            code >= 45 ? "Foggy" :
              code >= 1 ? "Partly cloudy" : "Clear skies";

  return `${condition} in Pune${parts.length ? " — " + parts.join(", ") : ""}.`;
}

/** Convert backend alerts → Local Alerts card shape. */
export function mapAlertsToLocalAlerts(alertsData) {
  if (!alertsData?.alerts?.length) return null;
  const iconFor = t =>
    t === "flood" ? "droplets" : t === "power_outage" ? "zap" : t === "congestion" ? "road" : "cloudRain";
  const relTime = iso => {
    if (!iso) return "Now";
    try {
      const d = Math.round((Date.now() - new Date(iso)) / 60000);
      return d < 1 ? "Just now" : d < 60 ? `${d} min ago` : `${Math.floor(d / 60)} hr ago`;
    } catch { return "Now"; }
  };
  return alertsData.alerts.slice(0, 3).map(a => ({
    iconKey: iconFor(a.alert_type),
    title: `[${a.alert_level}] ${(a.alert_type || "").replace(/_/g, " ")} alert`,
    desc: a.description,
    time: relTime(a.time_start),
    alertLevel: a.alert_level,
  }));
}

/** Convert backend incidents → Event Timeline card shape. */
export function mapIncidentsToTimeline(forecast) {
  if (!forecast?.active_incidents?.length) return null;
  const typeMap = { construction: "warning", congestion: "critical", incidents: "critical" };
  const fmtTime = iso => {
    try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  };
  return forecast.active_incidents.slice(0, 6).map(i => ({
    time: fmtTime(i.start_time),
    event: i.short_desc || i.full_desc || "Traffic incident reported",
    type: typeMap[i.type] || "info",
  }));
}

/** Convert backend remedies → City News card shape. */
export function mapRemediesToCityNews(forecast) {
  if (!forecast?.remedies?.length) return null;
  const iconFor = r =>
    r === "flood" ? "cloudRain" : r === "power_outage" ? "zap" : r === "congestion" ? "road" : "construction";
  return forecast.remedies.slice(0, 3).map(r => ({
    iconKey: iconFor(r.risk_type),
    title: r.action,
    desc: r.estimated_impact || `Priority ${r.priority} — ${(r.risk_type || "").replace(/_/g, " ")}`,
    time: "Live",
  }));
}

/**
 * Build a live chatbot reply from forecast data for common query keywords.
 * Returns null if no forecast data is available (caller falls back to backend /chat).
 */
export function buildLiveChatResponse(query, forecast, weatherSlogan) {
  if (!forecast) return null;
  const q = query.toLowerCase();
  const hrs = forecast.timeline || [];
  const get = key => Math.max(...hrs.map(h => h.risk_scores?.[key] ?? 0), 0);
  const flood = get("flood"), congestion = get("congestion");
  const power = get("power_outage"), overall = get("overall");
  const rain = hrs[0]?.weather?.precipitation_mm ?? 0;
  const temp = hrs[0]?.weather?.temperature_c ?? "--";

  if (/flood|water|rain|waterlog/.test(q))
    return `Live flood risk: **${Math.round(flood * 100)}%** — ${flood > 0.6 ? "HIGH. Avoid low-lying roads and underpasses." : flood > 0.3 ? "MODERATE. Exercise caution near drainage-prone areas." : "LOW. No major waterlogging expected."} Current rain: ${rain.toFixed(1)} mm/hr.`;

  if (/traffic|congestion|jam|road|drive|commute/.test(q)) {
    const inc = (forecast.active_incidents || []).find(i => i.type === "congestion" || i.type === "incidents");
    return `Live congestion: **${Math.round(congestion * 100)}%**. ${inc ? `Active: "${inc.short_desc}". ` : ""}${(forecast.rerouting || []).length ? `Rerouting suggested via: ${forecast.rerouting[0].alternative_routes?.join(", ") || "alternate corridors"}.` : "No active rerouting advisories."}`;
  }

  if (/weather|forecast|temperature|climate/.test(q))
    return `Current Pune conditions: **${temp}°C**, rain **${rain.toFixed(1)} mm/hr**. ${weatherSlogan || ""}`;

  if (/power|electricity|outage|light/.test(q))
    return `Power outage risk: **${Math.round(power * 100)}%**. ${power > 0.5 ? "Elevated — consider backup power." : "Grid appears stable."} ${(forecast.remedies || []).filter(r => r.risk_type === "power_outage").map(r => r.action).join(" ")}`;

  if (/safe|clear|okay|status/.test(q)) {
    const lvl = overall > 0.7 ? "HIGH RISK" : overall > 0.4 ? "MODERATE" : "SAFE";
    return `City status: **${lvl}** (overall risk ${Math.round(overall * 100)}%). ${(forecast.alerts || []).length} active alert(s). ${(forecast.alerts || [])[0]?.description || ""}`;
  }

  return `City overview — Risk: **${Math.round(overall * 100)}%**, Congestion: ${Math.round(congestion * 100)}%, Flood: ${Math.round(flood * 100)}%. ${(forecast.alerts || []).length > 0 ? (forecast.alerts || [])[0].description : "No active alerts."} ${(forecast.remedies || [])[0]?.action || ""}`;
}
