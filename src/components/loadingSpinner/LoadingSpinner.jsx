import style from "./LoadingSpinner.style.js";

function LoadingSpinner() {
  return (
    <div className="loading-spinner-container">
      <div className="spinner" />
      <p>Loading 3D trail...</p>
    </div>
  );
}

export default style(LoadingSpinner);
