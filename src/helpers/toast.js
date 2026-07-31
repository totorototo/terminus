const listeners = new Set();
let nextId = 0;

export const subscribeToToasts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const showToast = (message, { type = "info" } = {}) => {
  const toast = { id: ++nextId, message, type };
  listeners.forEach((listener) => listener(toast));
  return toast.id;
};
