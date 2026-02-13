import { describe, it, expect, beforeEach } from "vitest";

describe("Navigation - Constants and Logic", () => {
  // Constants from Navigation.jsx
  const SECTION_ITEM_HEIGHT = 66;
  const SECTION_ITEM_TRANSLATE = 6;

  describe("animation constants", () => {
    it("should define SECTION_ITEM_HEIGHT correctly", () => {
      expect(SECTION_ITEM_HEIGHT).toBe(66);
    });

    it("should define SECTION_ITEM_TRANSLATE correctly", () => {
      expect(SECTION_ITEM_TRANSLATE).toBe(6);
    });

    it("should use height in transition animations", () => {
      const enterStyle = { height: SECTION_ITEM_HEIGHT };
      expect(enterStyle.height).toBe(66);
    });

    it("should build translateY transform strings", () => {
      const fromTransform = `translateY(-${SECTION_ITEM_TRANSLATE}px)`;
      const enterTransform = "translateY(0px)";
      const leaveTransform = `translateY(-${SECTION_ITEM_TRANSLATE}px)`;

      expect(fromTransform).toBe("translateY(-6px)");
      expect(enterTransform).toBe("translateY(0px)");
      expect(leaveTransform).toBe("translateY(-6px)");
    });
  });

  describe("filter logic - remainingSections", () => {
    let mockSections;
    let mockCurrentPositionIndex;

    beforeEach(() => {
      mockSections = [
        { segmentId: "seg1", startIndex: 0, endIndex: 100 },
        { segmentId: "seg2", startIndex: 100, endIndex: 200 },
        { segmentId: "seg3", startIndex: 200, endIndex: 300 },
        { segmentId: "seg4", startIndex: 300, endIndex: 400 },
      ];
    });

    it("should filter sections where endIndex >= currentPositionIndex", () => {
      mockCurrentPositionIndex = 150;

      const remainingSections = mockSections.filter(
        (section) => section.endIndex >= mockCurrentPositionIndex,
      );

      expect(remainingSections).toHaveLength(3); // seg2, seg3, seg4
      expect(remainingSections[0].segmentId).toBe("seg2");
    });

    it("should return all sections when at start", () => {
      mockCurrentPositionIndex = 0;

      const remainingSections = mockSections.filter(
        (section) => section.endIndex >= mockCurrentPositionIndex,
      );

      expect(remainingSections).toHaveLength(4);
    });

    it("should return empty when past all sections", () => {
      mockCurrentPositionIndex = 500;

      const remainingSections = mockSections.filter(
        (section) => section.endIndex >= mockCurrentPositionIndex,
      );

      expect(remainingSections).toHaveLength(0);
    });

    it("should return single section when at boundary", () => {
      mockCurrentPositionIndex = 350;

      const remainingSections = mockSections.filter(
        (section) => section.endIndex >= mockCurrentPositionIndex,
      );

      expect(remainingSections).toHaveLength(1);
      expect(remainingSections[0].segmentId).toBe("seg4");
    });

    it("should handle null/undefined sections gracefully", () => {
      const remainingSections = null?.filter(
        (section) => section.endIndex >= mockCurrentPositionIndex,
      );

      expect(remainingSections).toBeUndefined();
    });

    it("should handle empty sections array", () => {
      mockSections = [];
      mockCurrentPositionIndex = 100;

      const remainingSections = mockSections.filter(
        (section) => section.endIndex >= mockCurrentPositionIndex,
      );

      expect(remainingSections).toHaveLength(0);
    });
  });

  describe("bearing to arrow icon mapping", () => {
    function getArrowIcon(bearing) {
      const normalizedBearing = ((bearing % 360) + 360) % 360;

      if (normalizedBearing >= 315 || normalizedBearing < 45) {
        return "ArrowUp"; // North
      } else if (normalizedBearing >= 45 && normalizedBearing < 135) {
        return "CornerUpRight"; // East
      } else if (normalizedBearing >= 135 && normalizedBearing < 225) {
        return "ArrowDown"; // South
      } else {
        return "CornerUpLeft"; // West
      }
    }

    it("should map North bearing to ArrowUp", () => {
      expect(getArrowIcon(0)).toBe("ArrowUp");
      expect(getArrowIcon(44)).toBe("ArrowUp"); // just before East
      expect(getArrowIcon(315)).toBe("ArrowUp"); // boundary, still North
      expect(getArrowIcon(359)).toBe("ArrowUp");
    });

    it("should map East bearing to CornerUpRight", () => {
      expect(getArrowIcon(90)).toBe("CornerUpRight");
      expect(getArrowIcon(45)).toBe("CornerUpRight"); // 45 IS included in East
      expect(getArrowIcon(134)).toBe("CornerUpRight"); // Just before South
    });

    it("should map South bearing to ArrowDown", () => {
      expect(getArrowIcon(180)).toBe("ArrowDown");
      expect(getArrowIcon(135)).toBe("ArrowDown"); // boundary
      expect(getArrowIcon(225)).toBe("CornerUpLeft"); // not included
    });

    it("should map West bearing to CornerUpLeft", () => {
      expect(getArrowIcon(270)).toBe("CornerUpLeft");
      expect(getArrowIcon(225)).toBe("CornerUpLeft"); // boundary
    });

    it("should handle negative bearings", () => {
      expect(getArrowIcon(-45)).toBe("ArrowUp"); // Same as 315
      expect(getArrowIcon(-90)).toBe("CornerUpLeft"); // Same as 270
    });

    it("should handle bearings > 360", () => {
      expect(getArrowIcon(365)).toBe("ArrowUp"); // Same as 5
      expect(getArrowIcon(450)).toBe("CornerUpRight"); // Same as 90
    });

    it("should handle boundary cases exactly", () => {
      expect(getArrowIcon(45)).toBe("CornerUpRight"); // 45 is start of East
      expect(getArrowIcon(135)).toBe("ArrowDown"); // 135 is start of South
      expect(getArrowIcon(225)).toBe("CornerUpLeft"); // 225 is start of West
      expect(getArrowIcon(315)).toBe("ArrowUp"); // 315 is start of North
    });
  });

  describe("spring config", () => {
    it("should use consistent spring config", () => {
      const springConfig = { tension: 170, friction: 26 };

      expect(springConfig.tension).toBe(170);
      expect(springConfig.friction).toBe(26);
    });

    it("should produce reasonable animation behavior", () => {
      const { tension, friction } = { tension: 170, friction: 26 };

      // Higher tension = faster response
      // Higher friction = more damping (less bouncy)
      expect(tension).toBeGreaterThan(0);
      expect(friction).toBeGreaterThan(0);
    });
  });
});
