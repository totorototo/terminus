import style from "./LoadingSpinner.style.js";

function LoadingSpinner({ className }) {
  return (
    <div className={className}>
      <div className="spinner" />
      <p>Loading 3D trail...</p>
    </div>
  );
}

export default style(LoadingSpinner);
