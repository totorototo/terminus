import { memo, useState, useEffect, useMemo } from "react";
import { useProjectedLocation } from "../../../store/store.js";
import style from "./LocationFreshness.style.js";

function formatAge(ageMs) {
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return "Updated just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `Updated ${hours}h ${remainingMinutes}m ago`;
}

function getFreshnessColor(ageMs) {
  const minutes = ageMs / 1000 / 60;
  if (minutes > 15) return "#E1351D";
  if (minutes > 5) return "#EA8827";
  return "#F4F7F5";
}

const LocationFreshness = memo(function LocationFreshness({ className }) {
  const projectedLocation = useProjectedLocation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { label, color, elevation } = useMemo(() => {
    const ts = projectedLocation?.timestamp;
    const elev = projectedLocation?.coords?.[2];

    if (!ts) {
      return { label: "No data", color: "#F4F7F5", elevation: null };
    }

    const ageMs = Math.max(0, now - ts);
    return {
      label: formatAge(ageMs),
      color: getFreshnessColor(ageMs),
      elevation: elev != null ? `${Math.round(elev)} m` : null,
    };
  }, [projectedLocation, now]);

  return (
    <div className={className}>
      <div className="freshness-col">
        <span className="freshness-dot" style={{ background: color }} />
        <span className="freshness-value">{label}</span>
        <span className="freshness-sublabel">last position</span>
      </div>
      <div className="freshness-divider" />
      <div className="freshness-col freshness-col--right">
        <span className="freshness-value">{elevation ?? "--"}</span>
        <span className="freshness-sublabel">elevation</span>
      </div>
    </div>
  );
});

export default style(LocationFreshness);
