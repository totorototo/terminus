// The race's wall clock. Waymark writes each cutoff with the race zone's offset and gpxz
// keeps it, so times read on it are the race's wherever the runner or a follower is.
// why shift and read on UTC: Retrace's way with the watch's offset; Intl's offset zones
// ("+02:00") aren't in every browser yet.

/**
 * The first timed waypoint's offset from UTC (s), or null: without a time, or in UTC (`Z`),
 * which other tools write whatever the race's zone. Null reads on the device's clock.
 */
export function raceUtcOffset(waypoints) {
  const timed = waypoints?.find((waypoint) => waypoint.time != null);
  return timed?.utcOffset ? timed.utcOffset : null;
}

const FORMATS = {
  time: {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
  day: { weekday: "short", day: "numeric", month: "short" },
};

/** ms → "Fri 08:34" ("time") or "Fri 21 Aug" ("day"), on the race's clock. */
export function formatRaceTime(ms, utcOffset, kind = "time") {
  const known = utcOffset != null;
  return new Intl.DateTimeFormat("en-GB", {
    ...FORMATS[kind],
    timeZone: known ? "UTC" : undefined,
  })
    .format(new Date(known ? ms + utcOffset * 1000 : ms))
    .replace(",", "");
}

/** 7200 → "UTC+2", -16200 → "UTC−4:30". From Retrace's format.js. */
export function formatUtcOffset(utcOffset) {
  if (!utcOffset) return "UTC";
  const minutes = Math.round(Math.abs(utcOffset) / 60);
  const [hours, rest] = [Math.floor(minutes / 60), minutes % 60];
  const tail = rest ? `:${String(rest).padStart(2, "0")}` : "";
  return `UTC${utcOffset > 0 ? "+" : "−"}${hours}${tail}`;
}

/** Whether the device's clock reads the race's at `ms`: a follower abroad's doesn't. */
export function onRaceClock(ms, utcOffset) {
  return (
    utcOffset == null || -new Date(ms).getTimezoneOffset() * 60 === utcOffset
  );
}

/**
 * "Times on the race's clock (UTC+2)." for a device on another clock, else null.
 * why only then: on the race's own clock the note says nothing; elsewhere "Fri 08:34" would
 * read as the follower's own time.
 */
export function raceClockNote(utcOffset, nowMs = Date.now()) {
  return onRaceClock(nowMs, utcOffset)
    ? null
    : `Times on the race's clock (${formatUtcOffset(utcOffset)}).`;
}
