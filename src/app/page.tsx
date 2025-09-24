"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic imports for SSR-safe Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

const colors = [
  "#e41a1c",
  "#377eb8",
  "#4daf4a",
  "#984ea3",
  "#ff7f00",
  "#ffff33",
  "#a65628",
  "#f781bf",
  "#999999",
  "#66c2a5",
  "#fc8d62",
  "#8da0cb",
  "#e78ac3",
  "#a6d854",
  "#ffd92f",
  "#e5c494",
  "#b3b3b3",
  "#1b9e77",
  "#d95f02",
  "#7570b3",
  "#66a61e",
  "#e7298a",
  "#a6761d",
  "#666666",
];

export default function WindborneAtlas() {
  const [flights, setFlights] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentHourPointer, setCurrentHourPointer] = useState(0);
  const [visiblePoints, setVisiblePoints] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  // Fetch flight data from API
  useEffect(() => {
    let mounted = true;
    async function fetchFlights() {
      try {
        const res = await fetch("/api/flights");
        const data = await res.json();
        if (!mounted) return;
        setFlights(data);
      } catch (e) {
        console.warn("Failed to fetch flights:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchFlights();
    const interval = setInterval(fetchFlights, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Animate hour-by-hour trajectories
  useEffect(() => {
    const hourKeys = Object.keys(flights).filter((k) => flights[k]?.length > 0);
    if (hourKeys.length === 0) return;

    let pointer = currentHourPointer % hourKeys.length;

    function animateHour() {
      const hourKey = hourKeys[pointer];
      const track = flights[hourKey];
      if (!track || track.length === 0) {
        pointer++;
        setTimeout(animateHour, 5000);
        return;
      }

      setVisiblePoints([]);
      let idx = 0;

      const interval = setInterval(() => {
        idx++;
        if (idx > track.length) {
          setVisiblePoints(track);
          clearInterval(interval);
          pointer++;
          setTimeout(animateHour, 5000); // show next hour after 5 sec
          setCurrentHourPointer(pointer);
        } else {
          setVisiblePoints(track.slice(0, idx));
        }
      }, 200);
    }

    animateHour();
  }, [flights]);

  if (!isClient) return <div>Loading map…</div>;

  const hourKeys = Object.keys(flights).filter((k) => flights[k]?.length > 0);
  const hourKey = hourKeys[currentHourPointer % hourKeys.length];
  const currentPoints = flights[hourKey] || [];
  const firstPoint = currentPoints[0] || { lat: 20, lon: 0 };
  const latestPoint = visiblePoints[visiblePoints.length - 1];

  const actualHour = hourKey ? parseInt(hourKey.split("_")[1], 10) : 0;
  const color = colors[actualHour % colors.length];

  return (
    <div className="min-h-screen">
      <header className="p-4 bg-slate-900 text-white">
        <h1 className="text-2xl">WindBorne Atlas — Live Constellation- Rudraksh Dhawan- University of Waterloo</h1>
        <p className="text-sm opacity-80">
          Animating one hour at a time. Each hour highlighted with a bright
          color. Some data versions from the API are corrupted because of which map fluctuates.
        </p>
      </header>

      <main className="p-4">
        {loading && <div>Loading constellation data…</div>}

        <div className="w-full h-[60vh] mb-4">
          <MapContainer
            key={`map-${actualHour}`}
            center={[firstPoint.lat, firstPoint.lon]}
            zoom={3}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {visiblePoints.length > 0 && (
              <>
                <Polyline
                  positions={visiblePoints.map((p) => [p.lat, p.lon])}
                  color={color}
                  pathOptions={{ weight: 4 }}
                />
                {latestPoint && (
                  <CircleMarker
                    center={[latestPoint.lat, latestPoint.lon]}
                    radius={8}
                    color={color}
                    fillOpacity={0.8}
                  >
                    <Popup>
                      <div style={{ minWidth: 220 }}>
                        <b>Hour:</b> {actualHour}
                        <br />
                        <b>Latest:</b> {latestPoint.lat.toFixed(4)},{" "}
                        {latestPoint.lon.toFixed(4)}
                        <br />
                        {latestPoint.time && (
                          <>
                            <b>Time:</b> {latestPoint.time}
                            <br />
                          </>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                )}
              </>
            )}
          </MapContainer>
        </div>

        <section>
          <h2 className="text-lg mb-2" style={{ color }}>
            Current Hour ({actualHour}) (API version eg. 01,..,23) Flight Data
          </h2>
          {currentPoints.length === 0 ? (
            <div>No points for this hour</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse border border-gray-400 w-full text-left">
                <thead>
                  <tr>
                    <th className="border border-gray-400 px-2 py-1">#</th>
                    <th className="border border-gray-400 px-2 py-1">
                      Latitude
                    </th>
                    <th className="border border-gray-400 px-2 py-1">
                      Longitude
                    </th>
                    <th className="border border-gray-400 px-2 py-1">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPoints.map((p, i) => (
                    <tr key={`${p.lat}_${p.lon}_${i}`}>
                      <td className="border border-gray-400 px-2 py-1">
                        {i + 1}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {p.lat.toFixed(4)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {p.lon.toFixed(4)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1">
                        {p.time || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
