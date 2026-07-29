import style from "./LoadingSpinner.style.js";

function LoadingSpinner({ className }) {
  return (
    <div className={className}>
      <div className="spinner" />
      <p>Loading trail data...</p>
    </div>
  );
}

const StyledLoadingSpinner = style(LoadingSpinner);

export default StyledLoadingSpinner;
