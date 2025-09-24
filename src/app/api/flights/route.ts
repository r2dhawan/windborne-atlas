/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export async function GET() {
  const suffixes = Array.from(
    { length: 24 },
    (_, i) => String(i).padStart(2, "0") + ".json"
  );

  const flightMap: Record<string, any[]> = {};

  await Promise.all(
    suffixes.map(async (s) => {
      try {
        const res = await fetch(`https://a.windbornesystems.com/treasure/${s}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const hourId = `hour_${s}`;
        flightMap[hourId] = [];

        data.forEach((entry) => {
          let lat, lon, time;

          if (Array.isArray(entry) && entry.length >= 2) {
            lat = Number(entry[0]);
            lon = Number(entry[1]);
            time = new Date().toISOString(); // use current timestamp
          } else if (entry.lat !== undefined && entry.lon !== undefined) {
            lat = Number(entry.lat);
            lon = Number(entry.lon);
            time = entry.time || new Date().toISOString();
          } else {
            return; // skip unsupported format
          }

          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            flightMap[hourId].push({ lat, lon, time });
          }
        });
      } catch (e) {
        console.warn("Failed fetch", s, e);
      }
    })
  );

  return NextResponse.json(flightMap);
}
