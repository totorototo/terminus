import useStore from "../../store/store.js";
import {
  DismissButton,
  Icon,
  Instructions,
  Overlay,
  Title,
} from "./InstallPromptOverlay.styles.js";

const isInstalled =
  window.navigator.standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;

const isMobile = window.matchMedia(
  "(hover: none) and (pointer: coarse)",
).matches;

// iOS Safari exposes window.navigator.standalone; other platforms don't
const isIOS = "standalone" in window.navigator;

export default function InstallPromptOverlay() {
  const dismissed = useStore((state) => state.app.installPromptDismissed);
  const dismiss = useStore((state) => state.dismissInstallPrompt);

  if (!isMobile || isInstalled || dismissed) return null;

  const instructions = isIOS
    ? 'Tap the Share button ↑ then "Add to Home Screen" for the full experience.'
    : 'Tap the browser menu ⋮ then "Add to Home Screen" for the full experience.';

  return (
    <Overlay>
      <Icon>
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
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" />
        </svg>
      </Icon>
      <Title>Install Terminus</Title>
      <Instructions>{instructions}</Instructions>
      <DismissButton onClick={dismiss}>Not now</DismissButton>
    </Overlay>
  );
}
