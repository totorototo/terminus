import { memo, useEffect, useMemo, useState } from "react";

import { rgba } from "polished";
import { useTheme } from "styled-components";

import useStore, { useProjectedLocation } from "../../../store/store.js";

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

const LocationFreshness = memo(function LocationFreshness({
  className,
  waiting = false,
}) {
  const projectedLocation = useProjectedLocation();
  const connectionStatus = useStore(
    (state) => state.gps.followerConnectionStatus,
  );
  const [now, setNow] = useState(Date.now());
  const theme = useTheme();
  const colors = theme.colors.dark;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { label, color, elevation } = useMemo(() => {
    const ts = projectedLocation?.timestamp;
    const elev = projectedLocation?.coords?.[2];

    if (!ts) {
      return {
        label: waiting ? "Waiting for runner" : "No data",
        color: rgba(colors["--color-text"], waiting ? 0.35 : 1),
        elevation: null,
      };
    }

    const ageMs = Math.max(0, now - ts);
    const minutes = ageMs / 1000 / 60;
    const freshnessColor =
      minutes > 15
        ? colors["--color-accent"]
        : minutes > 5
          ? colors["--color-primary"]
          : colors["--color-text"];

    return {
      label: formatAge(ageMs),
      color: freshnessColor,
      elevation: elev != null ? `${Math.round(elev)} m` : null,
    };
  }, [projectedLocation, now, colors]);

  const connectionLabel =
    connectionStatus === "disconnected"
      ? "connection lost"
      : connectionStatus === "connecting"
        ? "reconnecting…"
        : "last position";

  const connectionLabelColor =
    connectionStatus === "disconnected"
      ? colors["--color-accent"]
      : connectionStatus === "connecting"
        ? rgba(colors["--color-text"], 0.4)
        : null;

  return (
    <div className={className}>
      <div className="freshness-left">
        <div className="freshness-status">
          <span className="freshness-dot" style={{ background: color }} />
          <span className="freshness-value" data-testid="freshness-label">
            {label}
          </span>
        </div>
        <span
          className="freshness-sublabel"
          style={connectionLabelColor ? { color: connectionLabelColor } : null}
        >
          {connectionLabel}
        </span>
      </div>
      <div className="freshness-right">
        <span className="freshness-value" data-testid="freshness-elevation">
          {elevation ?? "--"}
        </span>
        <span className="freshness-sublabel">elevation</span>
      </div>
    </div>
  );
});

export default style(LocationFreshness);
