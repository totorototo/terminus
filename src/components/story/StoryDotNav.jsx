import { memo, useRef, useState } from "react";

import { STORY_SECTIONS } from "./storySections.js";

import style from "./StoryDotNav.style.js";

// why: set/releasePointerCapture can both throw (e.g. no real active pointer
// behind the event) — neither failure should block the rest of the gesture
// handling, so both call sites share one silent-fail wrapper instead of
// each carrying their own try/catch.
function safePointerCall(fn) {
  try {
    fn();
  } catch {
    // capture/release is an optimization; its failure doesn't block the drag.
  }
}

const StoryDotNav = memo(function StoryDotNav({
  className,
  activeIndex,
  onJump,
}) {
  const navRef = useRef(null);
  // why: keyed by pointerId (not a bare boolean) so a second finger landing
  // mid-drag on a touch device can't steal/fight the first one's gesture.
  const activePointerIdRef = useRef(null);
  // why: cached once per gesture instead of read on every pointermove — the
  // nav's box doesn't change mid-drag, and getBoundingClientRect forces a
  // layout flush, which is wasteful on a 60fps-sensitive drag path.
  const navRectRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);

  const indexFromClientY = (clientY) => {
    const rect = navRectRef.current;
    if (!rect || rect.height === 0) return null;
    const bandHeight = rect.height / STORY_SECTIONS.length;
    return Math.min(
      STORY_SECTIONS.length - 1,
      Math.max(0, Math.floor((clientY - rect.top) / bandHeight)),
    );
  };

  const moveTo = (clientY) => {
    const index = indexFromClientY(clientY);
    if (index != null && index !== dragIndex) {
      setDragIndex(index);
      onJump(index);
    }
  };

  // why: pointer capture is set on the whole nav, not the individual dot —
  // dragging the strip (not tapping one dot at a time) is the point. Every
  // subsequent move is delivered here regardless of which button (or the
  // gap between two) it's physically over, so which section is "current"
  // comes from position math against the nav's own box, not per-button hit
  // testing. touch-action: none (see style) hands the whole gesture to this
  // handler instead of letting the browser try to scroll/select from it.
  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (activePointerIdRef.current != null) return;
    activePointerIdRef.current = event.pointerId;
    navRectRef.current = navRef.current?.getBoundingClientRect() ?? null;
    // why: can throw — that must not skip the jump below, or a press that
    // fails to capture would silently do nothing instead of still acting
    // as a plain tap.
    safePointerCall(() => navRef.current?.setPointerCapture?.(event.pointerId));
    moveTo(event.clientY);
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== activePointerIdRef.current) return;
    event.preventDefault();
    moveTo(event.clientY);
  };

  const endDrag = (event) => {
    if (event.pointerId !== activePointerIdRef.current) return;
    activePointerIdRef.current = null;
    navRectRef.current = null;
    // why: clear the callout unconditionally first — releasePointerCapture
    // throws if the pointer was never actually captured (see onPointerDown),
    // and that must not leave the callout stuck on screen after release.
    setDragIndex(null);
    safePointerCall(() =>
      navRef.current?.releasePointerCapture?.(event.pointerId),
    );
  };

  return (
    <nav
      ref={navRef}
      className={className}
      aria-label="Story sections"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {dragIndex != null && (
        <div
          className="callout"
          aria-hidden="true"
          style={{
            top: `${((dragIndex + 0.5) / STORY_SECTIONS.length) * 100}%`,
          }}
        >
          {STORY_SECTIONS[dragIndex].label}
        </div>
      )}
      {STORY_SECTIONS.map(({ id, label }, index) => (
        <button
          key={id}
          type="button"
          className={index === activeIndex ? "dot active" : "dot"}
          aria-label={`Jump to ${label}`}
          aria-current={index === activeIndex ? "true" : undefined}
          onClick={() => onJump(index)}
        />
      ))}
    </nav>
  );
});

const StyledStoryDotNav = style(StoryDotNav);

export default StyledStoryDotNav;
