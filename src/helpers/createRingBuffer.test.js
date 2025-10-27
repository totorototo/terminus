import { describe, it, expect, beforeEach } from "vitest";
import createRingBuffer from "./createRingBuffer";

describe("createRingBuffer", () => {
  describe("initialization", () => {
    it("should create an empty buffer with specified length", () => {
      const buffer = createRingBuffer(5);
      expect(buffer.count()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
    });

    it("should throw error for invalid length", () => {
      expect(() => createRingBuffer(0)).toThrow(
        "Buffer length must be a positive integer.",
      );
      expect(() => createRingBuffer(-1)).toThrow(
        "Buffer length must be a positive integer.",
      );
      expect(() => createRingBuffer(3.5)).toThrow(
        "Buffer length must be a positive integer.",
      );
    });

    it("should initialize with provided initial state", () => {
      const initialData = [1, 2, 3];
      const buffer = createRingBuffer(5, initialData);
      expect(buffer.count()).toBe(3);
      expect(buffer.dump()).toEqual([1, 2, 3]);
    });

    it("should truncate initial state if longer than buffer length", () => {
      const initialData = [1, 2, 3, 4, 5, 6, 7];
      const buffer = createRingBuffer(5, initialData);
      expect(buffer.count()).toBe(5);
      expect(buffer.dump()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("push", () => {
    it("should add items to buffer", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      expect(buffer.count()).toBe(2);
      expect(buffer.dump()).toEqual([1, 2]);
    });

    it("should return the pushed item", () => {
      const buffer = createRingBuffer(3);
      const result = buffer.push("test");
      expect(result).toBe("test");
    });

    it("should wrap around when buffer is full", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Should overwrite 1
      expect(buffer.count()).toBe(3);
      expect(buffer.dump()).toEqual([2, 3, 4]);
    });

    it("should handle multiple wrap-arounds", () => {
      const buffer = createRingBuffer(3);
      for (let i = 1; i <= 10; i++) {
        buffer.push(i);
      }
      expect(buffer.count()).toBe(3);
      expect(buffer.dump()).toEqual([8, 9, 10]);
    });
  });

  describe("peek", () => {
    it("should return undefined for empty buffer", () => {
      const buffer = createRingBuffer(3);
      expect(buffer.peek()).toBeUndefined();
    });

    it("should return the last pushed item", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      expect(buffer.peek()).toBe(2);
    });

    it("should not remove the item", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      buffer.peek();
      expect(buffer.count()).toBe(2);
      expect(buffer.peek()).toBe(2);
    });

    it("should return correct item after wrap-around", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      expect(buffer.peek()).toBe(4);
    });
  });

  describe("dump", () => {
    it("should return empty array for empty buffer", () => {
      const buffer = createRingBuffer(3);
      expect(buffer.dump()).toEqual([]);
    });

    it("should return all items in correct order", () => {
      const buffer = createRingBuffer(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.dump()).toEqual([1, 2, 3]);
    });

    it("should return items in correct order after wrap-around", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.dump()).toEqual([3, 4, 5]);
    });

    it("should accept target array parameter", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      const target = [];
      const result = buffer.dump(target);
      expect(result).toBe(target);
      expect(target).toEqual([1, 2]);
    });

    it("should handle complex objects", () => {
      const buffer = createRingBuffer(3);
      const obj1 = { id: 1, value: "a" };
      const obj2 = { id: 2, value: "b" };
      buffer.push(obj1);
      buffer.push(obj2);
      const result = buffer.dump();
      expect(result).toEqual([obj1, obj2]);
      expect(result[0]).toBe(obj1); // Same reference
    });
  });

  describe("get", () => {
    let buffer;

    beforeEach(() => {
      buffer = createRingBuffer(5);
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
    });

    it("should return undefined for empty buffer", () => {
      const emptyBuffer = createRingBuffer(3);
      expect(emptyBuffer.get(0)).toBeUndefined();
    });

    it("should get item by positive index", () => {
      expect(buffer.get(0)).toBe(10);
      expect(buffer.get(1)).toBe(20);
      expect(buffer.get(2)).toBe(30);
    });

    it("should get item by negative index (from end)", () => {
      expect(buffer.get(-1)).toBe(30);
      expect(buffer.get(-2)).toBe(20);
      expect(buffer.get(-3)).toBe(10);
    });

    it("should wrap around for out of bounds positive index", () => {
      // With 3 items in a buffer of 5, accessing index beyond size wraps
      const result = buffer.get(5);
      expect(result).toBeDefined();
    });
  });

  describe("prev and next", () => {
    let buffer;

    beforeEach(() => {
      buffer = createRingBuffer(5);
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
    });

    it("should navigate backwards with prev", () => {
      expect(buffer.prev()).toBe(30);
      expect(buffer.prev()).toBe(20);
      expect(buffer.prev()).toBe(10);
    });

    it("should navigate forwards with next", () => {
      buffer.prev();
      buffer.prev();
      buffer.prev();
      expect(buffer.next()).toBe(20);
      expect(buffer.next()).toBe(30);
    });

    it("should wrap around with prev at buffer start", () => {
      // The prev() function moves the pointer but doesn't validate bounds
      // After 3 prev calls from the end, we're at uninitialized positions
      buffer.prev(); // 30
      buffer.prev(); // 20
      buffer.prev(); // 10
      const result = buffer.prev(); // Wraps to position 4 (uninitialized)
      // Since buffer only has 3 items (0,1,2), position 4 is uninitialized
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty buffer on next", () => {
      const emptyBuffer = createRingBuffer(3);
      expect(emptyBuffer.next()).toBeUndefined();
    });
  });

  describe("flush", () => {
    it("should clear all items from buffer", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.flush();
      expect(buffer.count()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.dump()).toEqual([]);
    });

    it("should allow pushing after flush", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      buffer.flush();
      buffer.push(10);
      expect(buffer.count()).toBe(1);
      expect(buffer.dump()).toEqual([10]);
    });
  });

  describe("state checks", () => {
    it("should correctly report isEmpty", () => {
      const buffer = createRingBuffer(3);
      expect(buffer.isEmpty()).toBe(true);
      buffer.push(1);
      expect(buffer.isEmpty()).toBe(false);
      buffer.flush();
      expect(buffer.isEmpty()).toBe(true);
    });

    it("should correctly report isFull", () => {
      const buffer = createRingBuffer(3);
      expect(buffer.isFull()).toBe(false);
      buffer.push(1);
      expect(buffer.isFull()).toBe(false);
      buffer.push(2);
      expect(buffer.isFull()).toBe(false);
      buffer.push(3);
      expect(buffer.isFull()).toBe(true);
    });

    it("should maintain isFull after wrap-around", () => {
      const buffer = createRingBuffer(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      expect(buffer.isFull()).toBe(true);
    });

    it("should correctly report count", () => {
      const buffer = createRingBuffer(5);
      expect(buffer.count()).toBe(0);
      buffer.push(1);
      expect(buffer.count()).toBe(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.count()).toBe(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.count()).toBe(5);
      buffer.push(6); // Wrap around
      expect(buffer.count()).toBe(5);
    });
  });

  describe("use case: location tracking", () => {
    it("should maintain last 10 GPS positions", () => {
      const buffer = createRingBuffer(10);

      // Simulate 15 location updates
      for (let i = 1; i <= 15; i++) {
        buffer.push({
          coords: [i * 0.001, i * 0.001, 0],
          timestamp: Date.now() + i * 1000,
        });
      }

      expect(buffer.count()).toBe(10);
      expect(buffer.isFull()).toBe(true);

      const history = buffer.dump();
      expect(history).toHaveLength(10);
      expect(history[0].coords[0]).toBeCloseTo(0.006);
      expect(history[9].coords[0]).toBeCloseTo(0.015);
    });

    it("should restore from persisted state", () => {
      const persistedLocations = [
        { coords: [1, 1, 0], timestamp: 1000 },
        { coords: [2, 2, 0], timestamp: 2000 },
        { coords: [3, 3, 0], timestamp: 3000 },
      ];

      const buffer = createRingBuffer(10, persistedLocations);

      expect(buffer.count()).toBe(3);
      expect(buffer.peek()).toEqual(persistedLocations[2]);

      // Can continue adding
      buffer.push({ coords: [4, 4, 0], timestamp: 4000 });
      expect(buffer.count()).toBe(4);
    });
  });
});
