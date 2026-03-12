import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Real Pune coordinates for each zone
const ZONE_COORDS = {
    1: [18.5308, 73.8475], // Shivajinagar
    2: [18.5074, 73.8077], // Kothrud
    3: [18.5912, 73.7390], // Hinjewadi
    4: [18.5590, 73.7868], // Baner
    5: [18.5089, 73.9260], // Hadapsar
    6: [18.5580, 73.8077], // Aundh
};

const PUNE_CENTER = [18.5362, 73.8478];

// Severity-based colors
const severityColor = (s) => s >= 70 ? "#D93025" : s >= 40 ? "#E37400" : "#F9AB00";
const severityBg = (s) => s >= 70 ? "#FCE8E6" : s >= 40 ? "#FEF7E0" : "#FFF8E1";

/* Pulsing ring for critical zones */
function PulseRing({ center, color }) {
    const map = useMap();
    const ringRef = useRef(null);

    useEffect(() => {
        if (!map) return;
        const L = require("leaflet");

        const ring = L.circleMarker(center, {
            radius: 34,
            color: color,
            weight: 1.5,
            fillOpacity: 0,
            opacity: 0.5,
            className: "leaflet-pulse-ring",
        }).addTo(map);

        ringRef.current = ring;
        return () => { map.removeLayer(ring); };
    }, [map, center, color]);

    return null;
}

/* Handles flying to selected zone */
function FlyToZone({ selectedZone }) {
    const map = useMap();
    useEffect(() => {
        if (selectedZone && ZONE_COORDS[selectedZone]) {
            map.flyTo(ZONE_COORDS[selectedZone], 14, { duration: 0.8 });
        }
    }, [selectedZone, map]);
    return null;
}

/* Zone alert labels using Leaflet DivIcon — only for problem zones */
function ZoneLabels({ zones }) {
    const map = useMap();
    const markersRef = useRef([]);

    useEffect(() => {
        if (!map) return;
        const L = require("leaflet");

        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];

        zones
            .filter((z) => z.problems && z.problems.length > 0)
            .forEach((z) => {
                const coords = ZONE_COORDS[z.id];
                if (!coords) return;

                // Show top problem as the label
                const topProblem = z.problems.reduce((a, b) => a.severity > b.severity ? a : b);
                const extraCount = z.problems.length - 1;

                const icon = L.divIcon({
                    className: "zone-label-icon",
                    html: `<div class="zone-alert-label">
                   <span class="zone-alert-name">${z.name}</span>
                   <span class="zone-alert-problem">${topProblem.icon} ${topProblem.label}${extraCount > 0 ? ` <span class="zone-alert-more">+${extraCount}</span>` : ""}</span>
                 </div>`,
                    iconSize: [0, 0],
                    iconAnchor: [0, -22],
                });

                const marker = L.marker(coords, { icon, interactive: false }).addTo(map);
                markersRef.current.push(marker);
            });

        return () => {
            markersRef.current.forEach(m => map.removeLayer(m));
            markersRef.current = [];
        };
    }, [map, zones]);

    return null;
}

export default function LeafletMap({ zones, selectedZone, setSelectedZone }) {
    // Only show zones that have active problems
    const alertZones = zones.filter((z) => z.problems && z.problems.length > 0);

    return (
        <div className="leaflet-map-wrapper">
            <MapContainer
                center={PUNE_CENTER}
                zoom={12}
                scrollWheelZoom={true}
                zoomControl={false}
                attributionControl={false}
                style={{ width: "100%", height: "100%", borderRadius: 12, minHeight: 360 }}
            >
                {/* CartoDB Voyager — clean Google Maps-like tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                <FlyToZone selectedZone={selectedZone} />
                <ZoneLabels zones={zones} />

                {/* Soft outer glow halos — only alert zones */}
                {alertZones.map((z) => {
                    const coords = ZONE_COORDS[z.id];
                    if (!coords) return null;
                    return (
                        <CircleMarker
                            key={"halo-" + z.id}
                            center={coords}
                            radius={z.risk === "critical" ? 36 : 30}
                            pathOptions={{
                                color: "transparent",
                                fillColor: z.color,
                                fillOpacity: 0.08,
                            }}
                            interactive={false}
                        />
                    );
                })}

                {/* Main zone alert circles — only problem zones */}
                {alertZones.map((z) => {
                    const coords = ZONE_COORDS[z.id];
                    if (!coords) return null;
                    const isSelected = selectedZone === z.id;
                    const topSeverity = Math.max(...z.problems.map(p => p.severity));
                    const circleColor = severityColor(topSeverity);
                    const baseRadius = z.risk === "critical" ? 20 : 17;

                    return (
                        <CircleMarker
                            key={z.id}
                            center={coords}
                            radius={isSelected ? baseRadius + 4 : baseRadius}
                            pathOptions={{
                                color: "white",
                                weight: isSelected ? 3 : 2,
                                fillColor: circleColor,
                                fillOpacity: isSelected ? 0.45 : 0.28,
                            }}
                            eventHandlers={{
                                click: () => setSelectedZone(z.id === selectedZone ? null : z.id),
                            }}
                        >
                            <Popup className="gmap-popup" closeButton={false} autoPan={true} offset={[0, -6]}>
                                <div className="gmap-popup-inner">
                                    <div className="gmap-popup-title">{z.name}</div>
                                    <div className="gmap-popup-alert-count">
                                        ⚠️ {z.problems.length} Active {z.problems.length === 1 ? "Alert" : "Alerts"}
                                    </div>
                                    <div className="gmap-popup-divider" />
                                    {z.problems.map((p, i) => (
                                        <div key={i} className="gmap-popup-row">
                                            <span className="gmap-popup-icon">{p.icon}</span>
                                            <span className="gmap-popup-label">{p.label}</span>
                                            <div className="gmap-popup-bar-wrap">
                                                <div className="gmap-popup-bar" style={{ width: p.severity + "%", background: severityColor(p.severity) }} />
                                            </div>
                                            <span className="gmap-popup-val" style={{ color: severityColor(p.severity) }}>{p.severity}%</span>
                                        </div>
                                    ))}
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}

                {/* Pulse rings for critical zones only */}
                {alertZones
                    .filter((z) => z.risk === "critical")
                    .map((z) => {
                        const coords = ZONE_COORDS[z.id];
                        if (!coords) return null;
                        return <PulseRing key={"pulse-" + z.id} center={coords} color="#D93025" />;
                    })}

                {/* Compact legend */}
                <div className="gmap-legend">
                    <div className="gmap-legend-item">
                        <span className="gmap-legend-dot" style={{ background: "#D93025" }} />
                        <span>Severe</span>
                    </div>
                    <div className="gmap-legend-item">
                        <span className="gmap-legend-dot" style={{ background: "#E37400" }} />
                        <span>Moderate</span>
                    </div>
                    <div className="gmap-legend-item">
                        <span className="gmap-legend-dot" style={{ background: "#F9AB00" }} />
                        <span>Low</span>
                    </div>
                </div>
            </MapContainer>
        </div>
    );
}
