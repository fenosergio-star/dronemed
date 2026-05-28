/**
 * Union-Find (Disjoint Set Union)
 * Gestion des zones couvertes et regroupement de centres de santé
 * Optimisé avec compression de chemin et union by rank
 */

export interface ZoneNode {
  id: string;
  name: string;
  region: string;
  district: string;
  healthCenterCount: number;
  totalPopulation: number;
  covered: boolean;
  droneBaseId?: string;
}

interface DSUNode {
  parent: number;
  rank: number;
  zone: ZoneNode;
}

export class ZoneUnionFind {
  private nodes: DSUNode[] = [];
  private indexMap: Map<string, number> = new Map();
  private zoneCount: number = 0;

  makeSet(zone: ZoneNode): void {
    if (this.indexMap.has(zone.id)) return;
    const index = this.nodes.length;
    this.indexMap.set(zone.id, index);
    this.nodes.push({ parent: index, rank: 0, zone });
    this.zoneCount++;
  }

  find(id: string): string {
    const index = this.indexMap.get(id);
    if (index === undefined) throw new Error(`Zone ${id} non trouvée`);
    return this.zoneIdForIndex(this.findIndex(index));
  }

  private findIndex(i: number): number {
    if (this.nodes[i].parent !== i) {
      this.nodes[i].parent = this.findIndex(this.nodes[i].parent);
    }
    return this.nodes[i].parent;
  }

  private zoneIdForIndex(index: number): string {
    return this.nodes[index].zone.id;
  }

  union(id1: string, id2: string): boolean {
    const i1 = this.indexMap.get(id1);
    const i2 = this.indexMap.get(id2);
    if (i1 === undefined || i2 === undefined) return false;

    const root1 = this.findIndex(i1);
    const root2 = this.findIndex(i2);

    if (root1 === root2) return false;

    if (this.nodes[root1].rank < this.nodes[root2].rank) {
      this.nodes[root1].parent = root2;
      this.mergeZoneData(root2, root1);
    } else if (this.nodes[root1].rank > this.nodes[root2].rank) {
      this.nodes[root2].parent = root1;
      this.mergeZoneData(root1, root2);
    } else {
      this.nodes[root2].parent = root1;
      this.nodes[root1].rank++;
      this.mergeZoneData(root1, root2);
    }

    this.zoneCount--;
    return true;
  }

  private mergeZoneData(target: number, source: number): void {
    this.nodes[target].zone.healthCenterCount += this.nodes[source].zone.healthCenterCount;
    this.nodes[target].zone.totalPopulation += this.nodes[source].zone.totalPopulation;
    this.nodes[target].zone.covered = this.nodes[target].zone.covered || this.nodes[source].zone.covered;
  }

  connected(id1: string, id2: string): boolean {
    const i1 = this.indexMap.get(id1);
    const i2 = this.indexMap.get(id2);
    if (i1 === undefined || i2 === undefined) return false;
    return this.findIndex(i1) === this.findIndex(i2);
  }

  getRootZone(id: string): ZoneNode | null {
    const index = this.indexMap.get(id);
    if (index === undefined) return null;
    const root = this.findIndex(index);
    return this.nodes[root].zone;
  }

  getComponentZones(id: string): ZoneNode[] {
    const index = this.indexMap.get(id);
    if (index === undefined) return [];
    const root = this.findIndex(index);
    return this.nodes
      .filter(n => this.findIndex(this.nodes.indexOf(n)) === root)
      .map(n => n.zone);
  }

  getComponentCount(): number {
    return this.zoneCount;
  }

  getAllComponents(): ZoneNode[][] {
    const components: Map<number, ZoneNode[]> = new Map();
    for (let i = 0; i < this.nodes.length; i++) {
      const root = this.findIndex(i);
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)!.push(this.nodes[i].zone);
    }
    return Array.from(components.values());
  }

  getCoveredZones(): ZoneNode[] {
    const coveredSet = new Set<number>();
    const result: ZoneNode[] = [];

    for (let i = 0; i < this.nodes.length; i++) {
      const root = this.findIndex(i);
      if (this.nodes[root].zone.covered && !coveredSet.has(root)) {
        coveredSet.add(root);
        result.push(this.nodes[root].zone);
      }
    }
    return result;
  }

  getUncoveredZones(): ZoneNode[] {
    const uncoveredSet = new Set<number>();
    const result: ZoneNode[] = [];

    for (let i = 0; i < this.nodes.length; i++) {
      const root = this.findIndex(i);
      if (!this.nodes[root].zone.covered && !uncoveredSet.has(root)) {
        uncoveredSet.add(root);
        result.push(this.nodes[root].zone);
      }
    }
    return result;
  }

  markZoneCovered(id: string, droneBaseId: string): boolean {
    const index = this.indexMap.get(id);
    if (index === undefined) return false;
    const root = this.findIndex(index);
    this.nodes[root].zone.covered = true;
    this.nodes[root].zone.droneBaseId = droneBaseId;
    return true;
  }

  findOptimalBase(region: string): { baseId: string; componentSize: number } | null {
    let best: { baseId: string; componentSize: number } | null = null;

    const components = this.getAllComponents();
    for (const component of components) {
      const regionZones = component.filter(z => z.region === region);
      if (regionZones.length > 0) {
        const totalCenters = component.reduce((sum, z) => sum + z.healthCenterCount, 0);
        const baseId = regionZones[0].droneBaseId || regionZones[0].id;
        if (!best || totalCenters > best.componentSize) {
          best = { baseId, componentSize: totalCenters };
        }
      }
    }
    return best;
  }
}
