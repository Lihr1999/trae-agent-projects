import { AStarPathfinder, CollisionDetector } from './pathfinding';
import type { Rack } from '../types';

describe('AStarPathfinder', () => {
  const testRacks: Rack[] = [
    {
      id: 'rack1',
      floorId: 'floor1',
      name: 'Rack 1',
      x: 2,
      y: 2,
      width: 2,
      height: 2,
      rows: 2,
      columns: 2,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  describe('constructor', () => {
    it('should create a grid with correct dimensions', () => {
      const pathfinder = new AStarPathfinder(10, 10, []);
      const path = pathfinder.findPath(0, 0, 5, 5);
      expect(path.length).toBeGreaterThan(0);
    });

    it('should mark rack positions as unwalkable', () => {
      const pathfinder = new AStarPathfinder(10, 10, testRacks);
      const path = pathfinder.findPath(0, 0, 2, 2);
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('findPath', () => {
    it('should find a valid path from start to end', () => {
      const pathfinder = new AStarPathfinder(10, 10, []);
      const path = pathfinder.findPath(0, 0, 5, 5);
      expect(path.length).toBe(11);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 5, y: 5 });
    });

    it('should return empty array for invalid coordinates', () => {
      const pathfinder = new AStarPathfinder(10, 10, []);
      const path = pathfinder.findPath(-1, 0, 5, 5);
      expect(path).toEqual([]);
    });

    it('should navigate around obstacles', () => {
      const pathfinder = new AStarPathfinder(10, 10, testRacks);
      const path = pathfinder.findPath(0, 0, 8, 8);
      expect(path.length).toBeGreaterThan(0);
      for (const point of path) {
        const isInRack =
          point.x >= 2 && point.x < 4 && point.y >= 2 && point.y < 4;
        expect(isInRack).toBe(false);
      }
    });

    it('should find nearest walkable when start is blocked', () => {
      const pathfinder = new AStarPathfinder(10, 10, testRacks);
      const path = pathfinder.findPath(2, 2, 8, 8);
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('updateObstacles', () => {
    it('should update the grid with new obstacles', () => {
      const blockingRack: Rack = {
        id: 'blocking',
        floorId: 'floor1',
        name: 'Blocking',
        x: 2,
        y: 0,
        width: 1,
        height: 5,
        rows: 2,
        columns: 2,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const pathfinder = new AStarPathfinder(10, 10, []);
      const pathBefore = pathfinder.findPath(0, 0, 5, 0);

      pathfinder.updateObstacles([blockingRack]);
      const pathAfter = pathfinder.findPath(0, 0, 5, 0);

      expect(pathBefore.length).not.toEqual(pathAfter.length);
    });
  });
});

describe('CollisionDetector', () => {
  let detector: CollisionDetector;

  beforeEach(() => {
    detector = new CollisionDetector();
  });

  describe('updateRobotPosition', () => {
    it('should update robot position', () => {
      detector.updateRobotPosition('robot1', 5, 5);
      const hasCollision = detector.checkCollision('robot2', 5, 5);
      expect(hasCollision).toBe(true);
    });
  });

  describe('removeRobot', () => {
    it('should remove robot from tracking', () => {
      detector.updateRobotPosition('robot1', 5, 5);
      detector.removeRobot('robot1');
      const hasCollision = detector.checkCollision('robot2', 5, 5);
      expect(hasCollision).toBe(false);
    });
  });

  describe('checkCollision', () => {
    it('should detect collision with other robot', () => {
      detector.updateRobotPosition('robot1', 5, 5);
      expect(detector.checkCollision('robot2', 5, 5)).toBe(true);
    });

    it('should not detect collision with itself', () => {
      detector.updateRobotPosition('robot1', 5, 5);
      expect(detector.checkCollision('robot1', 5, 5)).toBe(false);
    });

    it('should not detect collision when no overlap', () => {
      detector.updateRobotPosition('robot1', 5, 5);
      expect(detector.checkCollision('robot2', 6, 6)).toBe(false);
    });
  });

  describe('predictConflicts', () => {
    it('should detect path conflicts between robots', () => {
      const path1 = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];
      const path2 = [
        { x: 2, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ];

      detector.updateRobotPosition('robot1', 0, 0, path1);
      const conflicts = detector.predictConflicts('robot2', path2);

      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should return empty array when no conflicts', () => {
      const path1 = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ];
      const path2 = [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 5, y: 7 },
      ];

      detector.updateRobotPosition('robot1', 0, 0, path1);
      const conflicts = detector.predictConflicts('robot2', path2);

      expect(conflicts).toEqual([]);
    });
  });

  describe('getCongestionPoints', () => {
    it('should identify congestion points with multiple robots', () => {
      detector.updateRobotPosition('robot1', 5, 5);
      detector.updateRobotPosition('robot2', 5, 5);
      detector.updateRobotPosition('robot3', 6, 6);

      const congestion = detector.getCongestionPoints('floor1');

      expect(congestion.length).toBe(1);
      expect(congestion[0]).toEqual({ x: 5, y: 5, robotCount: 2 });
    });

    it('should return empty array when no congestion', () => {
      detector.updateRobotPosition('robot1', 5, 5);
      detector.updateRobotPosition('robot2', 6, 6);

      const congestion = detector.getCongestionPoints('floor1');

      expect(congestion).toEqual([]);
    });
  });
});
