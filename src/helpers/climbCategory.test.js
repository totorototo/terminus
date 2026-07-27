import { describe } from "vitest";

import { getClimbCategory } from "./climbCategory.js";

describe("getClimbCategory", () => {
  it("returns null for climbs below the Cat 4 threshold", () => {
    // score = 1000m × 5% = 5000 < 8000
    expect(getClimbCategory({ climbDistM: 1000, avgGradient: 5 })).toBeNull();
  });

  it("categorizes climbs at each threshold boundary", () => {
    expect(getClimbCategory({ climbDistM: 1000, avgGradient: 8 }).label).toBe(
      "Cat 4",
    );
    expect(getClimbCategory({ climbDistM: 2000, avgGradient: 8 }).label).toBe(
      "Cat 3",
    );
    expect(getClimbCategory({ climbDistM: 4000, avgGradient: 8 }).label).toBe(
      "Cat 2",
    );
    expect(getClimbCategory({ climbDistM: 8000, avgGradient: 8 }).label).toBe(
      "Cat 1",
    );
    expect(getClimbCategory({ climbDistM: 10_000, avgGradient: 8 }).label).toBe(
      "HC",
    );
  });
});
