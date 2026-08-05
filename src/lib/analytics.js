const getTracker = () => window.umami;

export const track = (event, data) => {
  getTracker()?.track(event, data);
};

// Only injected for `vite build` output — dev server and test runs never
// ship this script, so local/CI traffic never reaches Umami.
// data-domains is a second guard against a prod-mode build served from an
// unexpected host (local `vite preview`, a misconfigured deploy preview).
export const initUmami = () => {
  if (!import.meta.env.PROD) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = import.meta.env.VITE_UMAMI_SRC;
  script.dataset.websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  script.dataset.domains = "terminus-beta.netlify.app";
  script.dataset.autoTrack = "true";
  script.dataset.performance = "true";
  document.head.appendChild(script);
};
