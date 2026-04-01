import { useCallback, useMemo, useRef, useState } from "react";

import {
  animated,
  to,
  useChain,
  useReducedMotion,
  useSpring,
  useSpringRef,
  useTransition,
} from "@react-spring/web";
import { BarChart2 } from "@styled-icons/feather/BarChart2";
import { HelpCircle } from "@styled-icons/feather/HelpCircle";
import { LogOut } from "@styled-icons/feather/LogOut";
import { Map } from "@styled-icons/feather/Map";
import { MapPin } from "@styled-icons/feather/MapPin";
import { Moon } from "@styled-icons/feather/Moon";
import { Share2 } from "@styled-icons/feather/Share2";
import { Sliders } from "@styled-icons/feather/Sliders";
import { Sun } from "@styled-icons/feather/Sun";
import { X } from "@styled-icons/feather/X";
import { useClickAway } from "@uidotdev/usehooks";
import { useLocation } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import useStore from "../../store/store";

import style from "./Commands.style";

// Minimum arc spacing between button centres (~56 px keeps 48 px buttons clear).
const MIN_ARC_SPACING = 56; // px
const toRad = (deg) => (deg * Math.PI) / 180;
// Quarter-circle arc: spacing = RADIUS * (π/2) / (n-1) ≥ MIN_ARC_SPACING
// → RADIUS ≥ MIN_ARC_SPACING * (n-1) / (π/2)
function getRadius(n) {
  if (n <= 1) return 145;
  return Math.max(145, Math.ceil((MIN_ARC_SPACING * (n - 1)) / (Math.PI / 2)));
}

// Perfect quarter-circle from 180° (straight left) to 270° (straight up).
// Symmetric: equal angle from left edge to first button and top edge to last button.
// Not a hook (no hooks inside) — named getDockButtons to avoid the use* lint rule.
function getDockButtons({
  toggleSlopesMode,
  toggleProfileMode,
  toggleTheme,
  theme,
  displaySlopes,
  profileMode,
  navigate,
  close,
  follower,
  spotMe,
  shareLocation,
}) {
  return [
    {
      key: "leave",
      className: "off",
      onClick: () => navigate("/"),
      label: "Leave session",
      icon: <LogOut size={22} />,
    },
    ...(!follower
      ? [
          {
            key: "spot",
            className: "off",
            onClick: () => {
              spotMe();
              close();
            },
            label: "Find my current location",
            icon: <MapPin size={22} />,
          },
          {
            key: "share",
            className: "off",
            onClick: () => {
              shareLocation();
              close();
            },
            label: "Share my room code",
            icon: <Share2 size={22} />,
          },
        ]
      : []),
    {
      key: "help",
      className: "off",
      onClick: () => navigate("/help"),
      label: "Help",
      icon: <HelpCircle size={22} />,
    },
    {
      key: "theme",
      className: "off",
      onClick: () => {
        toggleTheme();
        close();
      },
      label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
      icon: theme === "dark" ? <Sun size={22} /> : <Moon size={22} />,
    },
    {
      key: "slopes",
      className: displaySlopes ? "on" : "off",
      ariaPressed: displaySlopes,
      onClick: () => {
        toggleSlopesMode();
        close();
      },
      label: "Toggle slope colors",
      icon: <BarChart2 size={22} />,
    },
    {
      key: "profile",
      className: !profileMode ? "on" : "off",
      ariaPressed: !profileMode,
      onClick: () => {
        toggleProfileMode();
        close();
      },
      label: "Toggle 2D / 3D view",
      icon: <Map size={22} />,
    },
  ];
}

function Commands({ className, follower }) {
  const [, navigate] = useLocation();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const dockRef = useRef(null);
  const reducedMotion = useReducedMotion();

  const {
    profileMode,
    displaySlopes,
    theme,
    toggleProfileMode,
    toggleSlopesMode,
    toggleTheme,
    shareLocation,
  } = useStore(
    useShallow((state) => ({
      profileMode: state.app.profileMode,
      displaySlopes: state.app.displaySlopes,
      theme: state.app.theme,
      toggleProfileMode: state.toggleProfileMode,
      toggleSlopesMode: state.toggleSlopesMode,
      toggleTheme: state.toggleTheme,
      shareLocation: state.shareLocation,
    })),
  );

  const spotMe = useStore((state) => state.spotMe);

  useClickAway(dockRef, () => setOpen(false));

  const close = useCallback(() => setOpen(false), []);

  const buttons = useMemo(
    () =>
      getDockButtons({
        toggleSlopesMode,
        toggleProfileMode,
        toggleTheme,
        theme,
        displaySlopes,
        profileMode,
        navigate,
        close,
        follower,
        spotMe,
        shareLocation,
      }),
    [
      toggleSlopesMode,
      toggleProfileMode,
      toggleTheme,
      theme,
      displaySlopes,
      profileMode,
      navigate,
      close,
      follower,
      spotMe,
      shareLocation,
    ],
  );
  const buttonIndex = useMemo(
    () => Object.fromEntries(buttons.map((b, i) => [b.key, i])),
    [buttons],
  );

  // Hooks below are always called (React rules) but only used in the
  // desktop FAB branch. They are inert when that branch is not rendered.
  const springRef = useSpringRef();
  const fabSpring = useSpring({
    ref: springRef,
    transform: open ? "rotate(45deg)" : "rotate(0deg)",
    config: { tension: 280, friction: 18 },
    immediate: reducedMotion,
  });

  // Radial fan: quarter-circle from 180° (straight left) to 270° (straight up).
  const transRef = useSpringRef();
  const startRad = toRad(180);
  const endRad = toRad(270);
  const radius = getRadius(buttons.length);
  const step =
    buttons.length > 1 ? (endRad - startRad) / (buttons.length - 1) : 0;

  const transitions = useTransition(open ? buttons : [], {
    ref: transRef,
    keys: (b) => b.key,
    from: { x: 0, y: 0, opacity: 0, scale: 0.5 },
    enter: (b) => {
      const angle = startRad + step * buttonIndex[b.key];
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        opacity: 1,
        scale: 1,
      };
    },
    leave: { x: 0, y: 0, opacity: 0, scale: 0.5 },
    config: { friction: 20, tension: 200 },
    trail: reducedMotion ? 0 : 40,
    immediate: reducedMotion,
  });

  // open:  FAB rotates first (t=0), then buttons fan out (t=0.1).
  // close: buttons collapse first (t=0), then FAB rotates back (t=0.1).
  useChain(open ? [springRef, transRef] : [transRef, springRef], [0, 0.1]);

  if (isDesktop) {
    return (
      <div className={`${className} desktop-dock`} ref={dockRef}>
        {transitions((spring, btn) => (
          <animated.button
            key={btn.key}
            className={btn.className}
            onClick={btn.onClick}
            aria-label={btn.label}
            aria-pressed={btn.ariaPressed}
            style={{
              transform: to(
                [spring.x, spring.y, spring.scale],
                (x, y, s) => `translate(${x}px, ${y}px) scale(${s})`,
              ),
              opacity: spring.opacity,
            }}
          >
            {btn.icon}
          </animated.button>
        ))}
        <button
          className="off fab"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close commands" : "Open commands"}
          aria-expanded={open}
        >
          <animated.span
            style={{
              transform: fabSpring.transform,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {open ? <X size={24} /> : <Sliders size={24} />}
          </animated.span>
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {!follower && (
        <button
          className={"off"}
          onClick={spotMe}
          aria-label="Find my current location"
        >
          <MapPin size={24} />
        </button>
      )}
      <button
        className={displaySlopes ? "on" : "off"}
        onClick={toggleSlopesMode}
        aria-label="Toggle slope colors"
        aria-pressed={displaySlopes}
      >
        <BarChart2 size={24} />
      </button>
      <button
        className={!profileMode ? "on" : "off"}
        onClick={toggleProfileMode}
        aria-label="Toggle 2D profile view"
        aria-pressed={profileMode}
      >
        <Map size={24} />
      </button>
      {!follower && (
        <button
          className={"off"}
          onClick={shareLocation}
          aria-label="Share my room code"
        >
          <Share2 size={24} />
        </button>
      )}
      <button
        className={"off"}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
      </button>
    </div>
  );
}

export default style(Commands);
