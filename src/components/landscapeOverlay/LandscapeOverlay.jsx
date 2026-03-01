import styled from "styled-components";

const Overlay = styled.div`
  display: none;

  @media (orientation: landscape) and (hover: none) and (pointer: coarse) {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: #1a1a1a;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 1.5rem;
    color: #fff;
    text-align: center;
    padding: 2rem;
  }

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

export default function LandscapeOverlay() {
  return (
    <Overlay>
      <svg
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
      <p>Please rotate your device to portrait mode</p>
    </Overlay>
  );
}
