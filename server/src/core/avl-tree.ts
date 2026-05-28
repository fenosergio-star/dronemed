/**
 * AVL Tree - Gestion d'inventaire avec alertes de péremption
 * Tri par date d'expiration avec auto-équilibrage O(log n)
 */

import { InventoryItem } from '../../../shared/types';

interface AVLNode {
  item: InventoryItem;
  left: AVLNode | null;
  right: AVLNode | null;
  height: number;
}

export class AVLInventoryTree {
  private root: AVLNode | null = null;
  private itemMap: Map<string, AVLNode> = new Map();

  private height(node: AVLNode | null): number {
    return node ? node.height : 0;
  }

  private balanceFactor(node: AVLNode | null): number {
    return node ? this.height(node.left) - this.height(node.right) : 0;
  }

  private updateHeight(node: AVLNode): void {
    node.height = 1 + Math.max(this.height(node.left), this.height(node.right));
  }

  private rotateRight(y: AVLNode): AVLNode {
    const x = y.left!;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this.updateHeight(y);
    this.updateHeight(x);
    return x;
  }

  private rotateLeft(x: AVLNode): AVLNode {
    const y = x.right!;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this.updateHeight(x);
    this.updateHeight(y);
    return y;
  }

  private rebalance(node: AVLNode): AVLNode {
    this.updateHeight(node);
    const bf = this.balanceFactor(node);

    if (bf > 1) {
      if (this.balanceFactor(node.left) < 0) {
        node.left = this.rotateLeft(node.left!);
      }
      return this.rotateRight(node);
    }
    if (bf < -1) {
      if (this.balanceFactor(node.right) > 0) {
        node.right = this.rotateRight(node.right!);
      }
      return this.rotateLeft(node);
    }
    return node;
  }

  private insertNode(node: AVLNode | null, item: InventoryItem): AVLNode {
    if (!node) {
      const newNode: AVLNode = { item, left: null, right: null, height: 1 };
      this.itemMap.set(item.id, newNode);
      return newNode;
    }

    const expA = new Date(item.expirationDate).getTime();
    const expB = new Date(node.item.expirationDate).getTime();

    if (expA < expB) {
      node.left = this.insertNode(node.left, item);
    } else if (expA > expB) {
      node.right = this.insertNode(node.right, item);
    } else {
      node.item = item;
      return node;
    }

    return this.rebalance(node);
  }

  insert(item: InventoryItem): void {
    this.root = this.insertNode(this.root, item);
  }

  remove(id: string): boolean {
    const node = this.itemMap.get(id);
    if (!node) return false;
    this.itemMap.delete(id);
    this.root = this.removeNode(this.root, node.item.expirationDate, id);
    return true;
  }

  private removeNode(node: AVLNode | null, expDate: string, id: string): AVLNode | null {
    if (!node) return null;

    const expTarget = new Date(expDate).getTime();
    const expCurrent = new Date(node.item.expirationDate).getTime();

    if (expTarget < expCurrent) {
      node.left = this.removeNode(node.left, expDate, id);
    } else if (expTarget > expCurrent) {
      node.right = this.removeNode(node.right, expDate, id);
    } else {
      if (node.item.id !== id) {
        node.left = this.removeNode(node.left, expDate, id);
        return this.rebalance(node);
      }

      if (!node.left || !node.right) {
        const temp = node.left || node.right;
        return temp ? this.rebalance(temp) : null;
      }

      const successor = this.findMin(node.right!);
      node.item = successor.item;
      node.right = this.removeNode(node.right, successor.item.expirationDate, successor.item.id);
    }

    return this.rebalance(node);
  }

  private findMin(node: AVLNode): AVLNode {
    return node.left ? this.findMin(node.left) : node;
  }

  getExpiringBefore(date: Date): InventoryItem[] {
    const result: InventoryItem[] = [];
    this.inOrderTraversal(this.root, result, new Date(date).getTime(), 'before');
    return result;
  }

  getExpiringAfter(date: Date): InventoryItem[] {
    const result: InventoryItem[] = [];
    this.inOrderTraversal(this.root, result, new Date(date).getTime(), 'after');
    return result;
  }

  getExpiringBetween(start: Date, end: Date): InventoryItem[] {
    const result: InventoryItem[] = [];
    this.rangeTraversal(this.root, result, start.getTime(), end.getTime());
    return result;
  }

  private inOrderTraversal(
    node: AVLNode | null,
    result: InventoryItem[],
    pivot: number,
    mode: 'before' | 'after'
  ): void {
    if (!node) return;
    const expTime = new Date(node.item.expirationDate).getTime();

    if (mode === 'before') {
      this.inOrderTraversal(node.left, result, pivot, mode);
      if (expTime <= pivot) result.push(node.item);
      this.inOrderTraversal(node.right, result, pivot, mode);
    } else {
      this.inOrderTraversal(node.left, result, pivot, mode);
      if (expTime >= pivot) result.push(node.item);
      this.inOrderTraversal(node.right, result, pivot, mode);
    }
  }

  private rangeTraversal(
    node: AVLNode | null,
    result: InventoryItem[],
    start: number,
    end: number
  ): void {
    if (!node) return;
    const expTime = new Date(node.item.expirationDate).getTime();

    if (expTime > start) this.rangeTraversal(node.left, result, start, end);
    if (expTime >= start && expTime <= end) result.push(node.item);
    if (expTime < end) this.rangeTraversal(node.right, result, start, end);
  }

  getById(id: string): InventoryItem | undefined {
    return this.itemMap.get(id)?.item;
  }

  getAll(): InventoryItem[] {
    const result: InventoryItem[] = [];
    this.flatten(this.root, result);
    return result;
  }

  private flatten(node: AVLNode | null, result: InventoryItem[]): void {
    if (!node) return;
    this.flatten(node.left, result);
    result.push(node.item);
    this.flatten(node.right, result);
  }

  getExpiringSoon(daysThreshold: number = 30): InventoryItem[] {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysThreshold * 86400000);
    return this.getExpiringBetween(now, threshold);
  }

  hasExpired(): InventoryItem[] {
    return this.getExpiringBefore(new Date());
  }

  get size(): number {
    return this.itemMap.size;
  }

  rotateStock(): { consumed: InventoryItem[]; alerts: string[] } {
    const items = this.getAll();
    const consumed: InventoryItem[] = [];
    const alerts: string[] = [];

    for (const item of items) {
      const daysLeft = Math.ceil(
        (new Date(item.expirationDate).getTime() - Date.now()) / 86400000
      );
      if (daysLeft <= 0) {
        alerts.push(`PRODUIT PERIME: ${item.name} (lot ${item.batchNumber})`);
      } else if (daysLeft <= 7) {
        alerts.push(`ALERTE CRITIQUE: ${item.name} expire dans ${daysLeft} jours (lot ${item.batchNumber})`);
      } else if (daysLeft <= 30) {
        alerts.push(`ALERTE: ${item.name} expire dans ${daysLeft} jours (lot ${item.batchNumber})`);
      }
    }

    return { consumed, alerts };
  }
}
