import style from "./LiveTracking.style";

function LiveTracking({ gpsResults, currentPositionIndex, className }) {
  return (
    <div className={className}>
      <h1>Live Tracking</h1>
      {gpsResults?.cumulativeDistances?.[currentPositionIndex] !==
        undefined && (
        <div>
          {`${(gpsResults.cumulativeDistances[currentPositionIndex] / 1000).toFixed(2)} km`}
        </div>
      )}
      {gpsResults?.cumulativeElevations?.[currentPositionIndex] !==
        undefined && (
        <div>
          {`↗ ${gpsResults.cumulativeElevations[currentPositionIndex].toFixed(0)} m`}
        </div>
      )}
      {gpsResults?.cumulativeElevationLosses?.[currentPositionIndex] !==
        undefined && (
        <div>
          {`↘ ${gpsResults.cumulativeElevationLosses[currentPositionIndex].toFixed(0)} m`}
        </div>
      )}
      {gpsResults?.points?.[currentPositionIndex] && (
        <div>
          {`${gpsResults.points[currentPositionIndex][2].toFixed(0)} m`}
        </div>
      )}
      {gpsResults?.slopes?.[currentPositionIndex] && (
        <div>{`${gpsResults.slopes[currentPositionIndex].toFixed(0)} %`}</div>
      )}
      {gpsResults?.points &&
        currentPositionIndex &&
        gpsResults?.points[currentPositionIndex] && (
          <div>{`${((currentPositionIndex * 100) / gpsResults.points.length).toFixed(2)} %`}</div>
        )}
    </div>
  );
}

export default style(LiveTracking);
