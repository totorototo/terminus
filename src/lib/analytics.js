const getTracker = () => window.umami;

export const track = (event, data) => {
  getTracker()?.track(event, data);
};
