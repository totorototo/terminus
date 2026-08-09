import { memo } from "react";

import style from "./StripReadout.style.js";

// why: shared by SlopeIntensity/RunnabilityIndex so their live-position
// readout (grade %/runnability label) stays in sync — was duplicated markup
// with a copy-pasted position formula before this.
const StripReadout = memo(function StripReadout({
  className,
  pct,
  value,
  color,
}) {
  if (pct === null || value === null) return null;

  return (
    <div className={className}>
      {/* why: the same value is already announced via the strip svg's
          aria-label; a visible-only duplicate would read twice to AT. */}
      <span
        className="strip-readout-value"
        style={{ "--strip-readout-pct": pct, color }}
        aria-hidden="true"
      >
        {value}
      </span>
    </div>
  );
});

const StyledStripReadout = style(StripReadout);

export default StyledStripReadout;
