import { memo } from "react";

import style from "./CollapseToggle.style.js";

const CollapseToggle = memo(function CollapseToggle({
  className,
  hiddenCount,
  onExpand,
}) {
  if (hiddenCount <= 0) return null;

  return (
    <button type="button" className={className} onClick={onExpand}>
      Show {hiddenCount} more
    </button>
  );
});

const StyledCollapseToggle = style(CollapseToggle);

export default StyledCollapseToggle;
