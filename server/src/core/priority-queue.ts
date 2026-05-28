/**
 * Priority Queue (Tas binaire - Max-Heap)
 * Ordonnancement des livraisons selon l'urgence vitale
 * Score de priorité basé sur : urgence médicale + temps d'attente + distance
 */

import { DeliveryOrder, UrgencyLevel } from '../../../shared/types';

interface PriorityNode {
  order: DeliveryOrder;
  priority: number;
}

export class DeliveryPriorityQueue {
  private heap: PriorityNode[] = [];

  private readonly urgencyScores: Record<UrgencyLevel, number> = {
    critique: 100,
    vitale: 80,
    urgent: 50,
    routine: 20,
  };

  private parent(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private leftChild(i: number): number {
    return 2 * i + 1;
  }

  private rightChild(i: number): number {
    return 2 * i + 2;
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private calculatePriority(order: DeliveryOrder): number {
    const urgencyScore = this.urgencyScores[order.urgency] || 0;

    const waitingHours = order.requestedAt
      ? (Date.now() - new Date(order.requestedAt).getTime()) / 3600000
      : 0;
    const waitingBonus = Math.min(waitingHours * 2, 30);

    return urgencyScore + waitingBonus;
  }

  private siftUp(i: number): void {
    while (i > 0 && this.heap[this.parent(i)].priority < this.heap[i].priority) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  private siftDown(i: number): void {
    let maxIndex = i;
    const left = this.leftChild(i);
    const right = this.rightChild(i);

    if (left < this.heap.length && this.heap[left].priority > this.heap[maxIndex].priority) {
      maxIndex = left;
    }
    if (right < this.heap.length && this.heap[right].priority > this.heap[maxIndex].priority) {
      maxIndex = right;
    }
    if (i !== maxIndex) {
      this.swap(i, maxIndex);
      this.siftDown(maxIndex);
    }
  }

  enqueue(order: DeliveryOrder): void {
    const priority = this.calculatePriority(order);
    this.heap.push({ order, priority });
    this.siftUp(this.heap.length - 1);
  }

  dequeue(): DeliveryOrder | null {
    if (this.heap.length === 0) return null;

    const max = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }

    return max.order;
  }

  peek(): DeliveryOrder | null {
    return this.heap.length > 0 ? this.heap[0].order : null;
  }

  updatePriority(orderId: string, newUrgency?: UrgencyLevel): void {
    const index = this.heap.findIndex(n => n.order.id === orderId);
    if (index === -1) return;

    if (newUrgency) {
      this.heap[index].order.urgency = newUrgency;
    }
    this.heap[index].priority = this.calculatePriority(this.heap[index].order);
    this.siftUp(index);
    this.siftDown(index);
  }

  remove(orderId: string): boolean {
    const index = this.heap.findIndex(n => n.order.id === orderId);
    if (index === -1) return false;

    if (index === this.heap.length - 1) {
      this.heap.pop();
      return true;
    }

    this.heap[index] = this.heap.pop()!;
    this.siftDown(index);
    this.siftUp(index);
    return true;
  }

  getUrgentOrders(minPriority: number = 50): DeliveryOrder[] {
    return this.heap
      .filter(n => n.priority >= minPriority)
      .sort((a, b) => b.priority - a.priority)
      .map(n => n.order);
  }

  getNextMission(): { order: DeliveryOrder; priority: number } | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    return { order: top.order, priority: top.priority };
  }

  getAll(): DeliveryOrder[] {
    return [...this.heap]
      .sort((a, b) => b.priority - a.priority)
      .map(n => n.order);
  }

  get length(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  clear(): void {
    this.heap = [];
  }

  recalibrateAll(): void {
    for (let i = this.heap.length - 1; i >= 0; i--) {
      this.heap[i].priority = this.calculatePriority(this.heap[i].order);
    }
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.siftDown(i);
    }
  }
}
