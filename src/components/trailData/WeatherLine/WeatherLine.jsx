import { AlertTriangle } from "@styled-icons/feather/AlertTriangle";
import { Cloud } from "@styled-icons/feather/Cloud";
import { CloudDrizzle } from "@styled-icons/feather/CloudDrizzle";
import { CloudLightning } from "@styled-icons/feather/CloudLightning";
import { CloudRain } from "@styled-icons/feather/CloudRain";
import { CloudSnow } from "@styled-icons/feather/CloudSnow";
import { Sun } from "@styled-icons/feather/Sun";
import { Wind } from "@styled-icons/feather/Wind";

import style from "./WeatherLine.style.js";

const WEATHER_ICONS = {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  Wind,
};

// Weather promoted to its own full-width row (own icon, own margins) rather
// than a squeezed inline badge, so cold/wet/windy checkpoints stay legible.
// A flagged line says WHICH condition tripped it: alert triangle up front and
// the offending stat(s) highlighted, instead of only a vague card tint.
function WeatherLine({ className, weather, iconColor, flaggedIconColor }) {
  const Icon = WEATHER_ICONS[weather.icon] ?? Cloud;
  const isCold = weather.temp <= 0;
  const isWet = weather.precipitation != null && weather.precipitation >= 50;
  const isWindy = weather.wind >= 30;
  const flagged = isCold || isWet || isWindy;

  const warning = flagged
    ? `Weather warning: ${[
        isCold && "freezing",
        isWet && "high precipitation",
        isWindy && "strong wind",
      ]
        .filter(Boolean)
        .join(", ")}`
    : undefined;

  return (
    <div
      className={`${className ?? ""} cp-weather-line${flagged ? " flagged" : ""}`}
      role={flagged ? "group" : undefined}
      aria-label={warning}
      title={warning}
    >
      <div className="cp-weather-main">
        <Icon size={16} color={flagged ? flaggedIconColor : iconColor} />
        {flagged && <AlertTriangle size={12} className="cp-weather-alert" />}
        <span className={`cp-weather-temp${isCold ? " flagged-stat" : ""}`}>
          {weather.temp > 0 ? `+${weather.temp}` : weather.temp}°
        </span>
      </div>
      <div className="cp-weather-detail">
        {weather.precipitation != null && (
          <span className={isWet ? "flagged-stat" : undefined}>
            {weather.precipitation}% precip
          </span>
        )}
        <span className={`cp-weather-wind${isWindy ? " flagged-stat" : ""}`}>
          <Wind size={11} />
          {weather.wind} km/h
        </span>
      </div>
    </div>
  );
}

const StyledWeatherLine = style(WeatherLine);

export default StyledWeatherLine;
