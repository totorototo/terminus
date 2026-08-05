import { useEffect, useRef, useState } from "react";

import styled from "styled-components";

const LANDSCAPE_QUERY =
  "(orientation: landscape) and (hover: none) and (pointer: coarse)";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  background: ${({ theme }) =>
    theme.colors[theme.currentVariant]["--color-background"]};
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1.5rem;
  color: ${({ theme }) => theme.colors[theme.currentVariant]["--color-text"]};
  text-align: center;
  padding: 2rem;

  svg {
    opacity: 0.7;
  }

  p {
    font-size: 1rem;
    font-weight: 400;
    opacity: 0.8;
    margin: 0;
  }
`;

const DismissButton = styled.button`
  background: none;
  border: 1px solid
    ${({ theme }) => theme.colors[theme.currentVariant]["--color-text"]};
  border-radius: ${({ theme }) => theme.borderRadius["--border-radius-md"]};
  color: ${({ theme }) => theme.colors[theme.currentVariant]["--color-text"]};
  font-size: ${({ theme }) => theme.font.sizes["--font-size-small"]};
  padding: 0.5rem 1.5rem;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity ${({ theme }) => theme.transitions["--transition-fast"]};

  &:active {
    opacity: 1;
  }
`;

export default function LandscapeOverlay() {
  const [isLandscape, setIsLandscape] = useState(
    () => window.matchMedia(LANDSCAPE_QUERY).matches,
  );
  const [dismissed, setDismissed] = useState(false);
  const dismissButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(LANDSCAPE_QUERY);
    const handleChange = (event) => {
      setIsLandscape(event.matches);
      // Re-arm the prompt once the device goes back to portrait, so a
      // dismissal doesn't silence it permanently for the whole session.
      if (!event.matches) setDismissed(false);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const visible = isLandscape && !dismissed;

  // why: dismiss button is the overlay's only focusable element, so trapping
  // focus is just refusing to let Tab move it elsewhere — no focus-trap
  // library needed.
  useEffect(() => {
    if (!visible) return;
    previouslyFocusedRef.current = document.activeElement;
    dismissButtonRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [visible]);

  if (!visible) return null;

  const handleKeyDown = (event) => {
    if (event.key === "Tab") event.preventDefault();
  };

  return (
    <Overlay
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="landscape-overlay-message"
      onKeyDown={handleKeyDown}
    >
      <svg
        aria-hidden="true"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Phone outline rotated to landscape */}
        <rect x="2" y="7" width="20" height="10" rx="2" />
        <circle cx="19.5" cy="12" r="0.5" fill="currentColor" />
        {/* Rotation arrows */}
        <path d="M8 2 Q12 0 16 2" />
        <path d="M15 2 l1 -2 l1 2" />
        <path d="M16 22 Q12 24 8 22" />
        <path d="M9 22 l-1 2 l-1 -2" />
      </svg>
      <p id="landscape-overlay-message">
        Please rotate your device to portrait mode
      </p>
      <DismissButton ref={dismissButtonRef} onClick={() => setDismissed(true)}>
        Continue in landscape
      </DismissButton>
    </Overlay>
  );
}
