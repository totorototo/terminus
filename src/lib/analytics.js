const getTracker = () => window.umami;

export const track = (event, data) => {
  getTracker()?.track(event, data);
};

export const trackPageview = (url) => {
  getTracker()?.track((props) => ({ ...props, url }));
};
