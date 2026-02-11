import { ELEVATION_GRADE } from "../constants.js";

// Get elevation grade based on slope percentage
export const getRange = (percent) => {
  if (Math.abs(percent) < 5) {
    return ELEVATION_GRADE.SMALL;
  } else if (Math.abs(percent) >= 5 && Math.abs(percent) < 10) {
    return ELEVATION_GRADE.EASY;
  } else if (Math.abs(percent) >= 10 && Math.abs(percent) < 15) {
    return ELEVATION_GRADE.MEDIUM;
  } else if (Math.abs(percent) >= 15 && Math.abs(percent) < 20) {
    return ELEVATION_GRADE.DIFFICULT;
  } else if (Math.abs(percent) >= 20) {
    return ELEVATION_GRADE.HARD;
  }
  return ELEVATION_GRADE.UNKNOWN;
};
