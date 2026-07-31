import { useCallback, useEffect, useState } from "react";

import { subscribeToToasts } from "../../helpers/toast.js";

import style from "./ToastContainer.style.js";

const TOAST_DURATION_MS = 4000;

function ToastContainer({ className }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToToasts((toast) => {
      setToasts((current) => [...current, toast]);
      setTimeout(() => dismiss(toast.id), TOAST_DURATION_MS);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className={className} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

const StyledToastContainer = style(ToastContainer);

export default StyledToastContainer;
