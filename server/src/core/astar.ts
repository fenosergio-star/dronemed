/**
 * Algorithme A* - Calcul d'itinéraire optimal pour drones
 * Évite les zones de relief élevé (montagnes) à Madagascar
 * Vérifie l'autonomie batterie avant chaque vol
 */

import { Coordinates, RouteResult, BatteryStatus } from '../../../shared/types';

interface GridNode {
  x: number;
  y: number;
  lat: number;
  lng: number;
  altitude: number;
  g: number;
  h: number;
  f: number;
  parent: GridNode | null;
  traversable: boolean;
}

interface TerrainSample {
  lat: number;
  lng: number;
  altitude: number;
  terrainType: 'eau' | 'plaine' | 'colline' | 'montagne' | 'foret';
  risk: number;
}

export class AStarRouter {
  private gridSize: number;
  private resolutionKm: number;
  private terrainCache: Map<string, TerrainSample> = new Map();
  private maxAltitude: number = 2876;
  private noFlyZones: { center: Coordinates; radiusKm: number }[] = [];

  readonly DRONE_SPEED_KMH = 60;
  readonly DRONE_BATTERY_CONSUMPTION_PER_KM = 1.2;
  readonly BATTERY_RESERVE_FACTOR = 1.3;
  readonly MAX_ALTITUDE_SAFE = 2500;

  constructor(gridSize: number = 200, resolutionKm: number = 1.5) {
    this.gridSize = gridSize;
    this.resolutionKm = resolutionKm;
    this.initializeMadagascarTerrain();
    this.initializeNoFlyZones();
  }

  private initializeMadagascarTerrain(): void {
    const terrainProfile: [number, number, number, string][] = [
      [-12.0, 49.0, 10, 'eau'], [-13.0, 48.0, 50, 'plaine'],
      [-14.0, 47.0, 100, 'colline'], [-15.0, 48.0, 800, 'montagne'],
      [-16.0, 47.0, 1200, 'montagne'], [-17.0, 47.0, 1500, 'montagne'],
      [-18.0, 47.0, 1400, 'montagne'], [-18.5, 47.5, 1800, 'montagne'],
      [-19.0, 47.0, 2000, 'montagne'], [-19.5, 46.5, 2200, 'montagne'],
      [-19.8, 47.0, 2500, 'montagne'], [-20.0, 47.0, 2000, 'montagne'],
      [-21.0, 47.0, 1500, 'montagne'], [-22.0, 47.0, 800, 'colline'],
      [-23.0, 46.0, 600, 'colline'], [-24.0, 45.0, 100, 'plaine'],
      [-25.0, 44.0, 50, 'plaine'], [-18.0, 49.0, 10, 'eau'],
      [-13.0, 50.0, 10, 'eau'], [-12.5, 48.5, 30, 'foret'],
      [-14.5, 49.0, 200, 'foret'], [-16.5, 46.5, 400, 'foret'],
      [-18.5, 45.5, 100, 'plaine'], [-20.5, 45.0, 50, 'plaine'],
      [-17.5, 48.5, 300, 'colline'], [-15.5, 49.5, 10, 'eau'],
    ];

    for (const [lat, lng, alt, type] of terrainProfile) {
      const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
      this.terrainCache.set(key, {
        lat, lng, altitude: alt,
        terrainType: type as TerrainSample['terrainType'],
        risk: type === 'montagne' ? 0.9 : type === 'colline' ? 0.4 : type === 'foret' ? 0.3 : 0.1,
      });

      for (let dx = -0.3; dx <= 0.3; dx += 0.15) {
        for (let dy = -0.3; dy <= 0.3; dy += 0.15) {
          if (dx === 0 && dy === 0) continue;
          const nearKey = `${(lat + dx).toFixed(1)},${(lng + dy).toFixed(1)}`;
          if (!this.terrainCache.has(nearKey)) {
            this.terrainCache.set(nearKey, {
              lat: lat + dx, lng: lng + dy,
              altitude: alt + (Math.random() - 0.5) * 200,
              terrainType: type as TerrainSample['terrainType'],
              risk: type === 'montagne' ? 0.85 : type === 'colline' ? 0.35 : 0.1,
            });
          }
        }
      }
    }
  }

  private initializeNoFlyZones(): void {
    this.noFlyZones = [
      { center: { lat: -18.5, lng: 47.5 }, radiusKm: 30 },
      { center: { lat: -19.5, lng: 46.5 }, radiusKm: 25 },
      { center: { lat: -20.0, lng: 47.0 }, radiusKm: 20 },
      { center: { lat: -17.0, lng: 47.0 }, radiusKm: 35 },
      { center: { lat: -15.0, lng: 48.0 }, radiusKm: 15 },
    ];
  }

  private getTerrain(lat: number, lng: number): TerrainSample {
    const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
    const cached = this.terrainCache.get(key);
    if (cached) return cached;

    const interpolated: TerrainSample = {
      lat, lng,
      altitude: Math.random() * 300,
      terrainType: 'plaine',
      risk: 0.1,
    };
    this.terrainCache.set(key, interpolated);
    return interpolated;
  }

  private toGrid(lat: number, lng: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): { x: number; y: number } {
    const x = Math.floor((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng) * (this.gridSize - 1));
    const y = Math.floor((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat) * (this.gridSize - 1));
    return { x: Math.max(0, Math.min(this.gridSize - 1, x)), y: Math.max(0, Math.min(this.gridSize - 1, y)) };
  }

  private toLatLng(x: number, y: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): Coordinates {
    return {
      lng: bounds.minLng + (x / (this.gridSize - 1)) * (bounds.maxLng - bounds.minLng),
      lat: bounds.minLat + (y / (this.gridSize - 1)) * (bounds.maxLat - bounds.minLat),
    };
  }

  private haversine(a: Coordinates, b: Coordinates): number {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinDLng * sinDLng;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  private isNoFlyZone(lat: number, lng: number): boolean {
    for (const zone of this.noFlyZones) {
      const dist = this.haversine({ lat, lng }, zone.center);
      if (dist <= zone.radiusKm) return true;
    }
    return false;
  }

  private getTraversalCost(from: GridNode, to: GridNode): number {
    const dist = this.haversine({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
    const altitudePenalty = Math.max(0, (to.altitude - this.MAX_ALTITUDE_SAFE) / this.MAX_ALTITUDE_SAFE) * 10;
    const noFlyPenalty = this.isNoFlyZone(to.lat, to.lng) ? 1000 : 0;
    const terrainCost = this.getTerrain(to.lat, to.lng).risk * 5;
    return dist + altitudePenalty + noFlyPenalty + terrainCost;
  }

  private heuristic(from: GridNode, to: GridNode): number {
    const dist = this.haversine({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
    const altDiff = Math.max(0, (to.altitude - from.altitude) / this.MAX_ALTITUDE_SAFE) * 5;
    return dist + altDiff;
  }

  private getNeighbors(node: GridNode, grid: (GridNode | null)[][], bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): GridNode[] {
    const neighbors: GridNode[] = [];
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1],
    ];

    for (const [dx, dy] of directions) {
      const nx = node.x + dx;
      const ny = node.y + dy;

      if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) continue;
      if (!grid[ny][nx] || !grid[ny][nx]!.traversable) continue;

      neighbors.push(grid[ny][nx]!);
    }
    return neighbors;
  }

  findRoute(
    start: Coordinates,
    end: Coordinates,
    batteryLevel: number,
    currentPayload: number,
    maxPayload: number,
    maxRange: number
  ): RouteResult {
    const payloadRatio = currentPayload / (maxPayload || 1);
    const effectiveRange = maxRange * (1 - payloadRatio * 0.3);

    const margin = 2.0;
    const bounds = {
      minLat: Math.min(start.lat, end.lat) - margin,
      maxLat: Math.max(start.lat, end.lat) + margin,
      minLng: Math.min(start.lng, end.lng) - margin,
      maxLng: Math.max(start.lng, end.lng) + margin,
    };

    const grid: (GridNode | null)[][] = Array.from({ length: this.gridSize }, () =>
      Array(this.gridSize).fill(null)
    );

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const coord = this.toLatLng(x, y, bounds);
        const terrain = this.getTerrain(coord.lat, coord.lng);
        const isNoFly = this.isNoFlyZone(coord.lat, coord.lng);

        grid[y][x] = {
          x, y,
          lat: coord.lat,
          lng: coord.lng,
          altitude: terrain.altitude,
          g: 0, h: 0, f: 0,
          parent: null,
          traversable: !isNoFly && terrain.altitude < this.MAX_ALTITUDE_SAFE && terrain.risk < 0.8,
        };
      }
    }

    const startGrid = this.toGrid(start.lat, start.lng, bounds);
    const endGrid = this.toGrid(end.lat, end.lng, bounds);
    const startNode = grid[startGrid.y][startGrid.x]!;
    const endNode = grid[endGrid.y][endGrid.x]!;

    const openSet: GridNode[] = [startNode];
    const closedSet: Set<string> = new Set();

    startNode.g = 0;
    startNode.h = this.heuristic(startNode, endNode);
    startNode.f = startNode.h;

    let iterations = 0;
    const maxIterations = this.gridSize * this.gridSize;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      let currentIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIdx].f) {
          currentIdx = i;
        }
      }

      const current = openSet[currentIdx];

      if (current.x === endNode.x && current.y === endNode.y) {
        return this.reconstructPath(current, batteryLevel, payloadRatio, effectiveRange);
      }

      openSet.splice(currentIdx, 1);
      const key = `${current.x},${current.y}`;
      closedSet.add(key);

      const neighbors = this.getNeighbors(current, grid, bounds);
      for (const neighbor of neighbors) {
        const nKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(nKey)) continue;

        const tentativeG = current.g + this.getTraversalCost(current, neighbor);

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        } else if (tentativeG >= neighbor.g) {
          continue;
        }

        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = this.heuristic(neighbor, endNode);
        neighbor.f = neighbor.g + neighbor.h;
      }
    }

    const directDist = this.haversine(start, end);
    return {
      path: [start, end],
      distance: directDist,
      duration: (directDist / this.DRONE_SPEED_KMH) * 60,
      batteryRequired: directDist * this.DRONE_BATTERY_CONSUMPTION_PER_KM * 2,
      obstacles: ['Aucun chemin évitant les reliefs trouvé'],
      safeToFly: this.checkBattery(batteryLevel, directDist * 2),
    };
  }

  private reconstructPath(
    endNode: GridNode,
    batteryLevel: number,
    payloadRatio: number,
    effectiveRange: number
  ): RouteResult {
    const path: Coordinates[] = [];
    let current: GridNode | null = endNode;
    let totalDistance = 0;
    let maxAltitude = 0;
    const obstacles: string[] = [];

    while (current) {
      path.unshift({ lat: current.lat, lng: current.lng });
      if (current.altitude > maxAltitude) {
        maxAltitude = current.altitude;
      }
      current = current.parent;
    }

    for (let i = 1; i < path.length; i++) {
      totalDistance += this.haversine(path[i - 1], path[i]);
    }

    if (maxAltitude > 2000) obstacles.push('Traversée de zone de haute altitude');
    if (totalDistance > effectiveRange) obstacles.push('Distance excède le rayon d\'action effectif');

    const roundTripDistance = totalDistance * 2;
    const batteryRequired = roundTripDistance * this.DRONE_BATTERY_CONSUMPTION_PER_KM;
    const adjustedBatteryRequired = batteryRequired * this.BATTERY_RESERVE_FACTOR;
    const duration = (totalDistance / this.DRONE_SPEED_KMH) * 60;

    return {
      path,
      distance: Math.round(totalDistance * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      batteryRequired: Math.round(adjustedBatteryRequired * 100) / 100,
      obstacles,
      safeToFly: this.checkBattery(batteryLevel, adjustedBatteryRequired),
    };
  }

  private checkBattery(batteryLevel: number, requiredBattery: number): boolean {
    return batteryLevel >= requiredBattery;
  }

  checkBatteryForMission(
    batteryLevel: number,
    start: Coordinates,
    end: Coordinates,
    payloadPercent: number = 0
  ): BatteryStatus {
    const dist = this.haversine(start, end) * 2;
    const payloadMultiplier = 1 + (payloadPercent / 100) * 0.3;
    const required = dist * this.DRONE_BATTERY_CONSUMPTION_PER_KM * this.BATTERY_RESERVE_FACTOR * payloadMultiplier;
    const estimatedFlightTime = (dist / this.DRONE_SPEED_KMH) * 60;

    return {
      droneId: '',
      currentLevel: batteryLevel,
      estimatedFlightTime: Math.round(estimatedFlightTime * 100) / 100,
      needsCharge: batteryLevel < 30,
      canCompleteMission: batteryLevel >= required,
    };
  }

  addNoFlyZone(center: Coordinates, radiusKm: number): void {
    this.noFlyZones.push({ center, radiusKm });
  }

  getEstimatedDuration(start: Coordinates, end: Coordinates): number {
    const dist = this.haversine(start, end);
    return Math.round((dist / this.DRONE_SPEED_KMH) * 60 * 100) / 100;
  }
}
