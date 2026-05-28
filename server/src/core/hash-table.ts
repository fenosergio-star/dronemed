/**
 * Table de Hachage - Stockage sécurisé des données patients
 * Hachage SHA-256 des informations sensibles avec chaînage séparé
 */

import * as crypto from 'crypto';

interface HashEntry<T> {
  key: string;
  value: T;
  next: HashEntry<T> | null;
}

export class SecureHashTable<T extends { [key: string]: any }> {
  private buckets: (HashEntry<T> | null)[];
  private capacity: number;
  private size: number = 0;
  private readonly sensitiveFields: string[];
  private readonly pepper: string;

  constructor(
    capacity: number = 256,
    sensitiveFields: string[] = ['nom', 'contact', 'conditions'],
    pepper: string = 'DroneMed2035::Madagascar'
  ) {
    this.capacity = capacity;
    this.buckets = new Array(capacity).fill(null);
    this.sensitiveFields = sensitiveFields;
    this.pepper = pepper;
  }

  private hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % this.capacity;
  }

  hashSensitiveData(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value + this.pepper)
      .digest('hex');
  }

  private anonymize(data: T): T {
    const anonymized = { ...data };
    for (const field of this.sensitiveFields) {
      const val = (anonymized as any)[field];
      if (val !== undefined) {
        if (typeof val === 'string') {
          (anonymized as any)[field] = this.hashSensitiveData(val);
        } else if (Array.isArray(val)) {
          (anonymized as any)[field] = val.map((item: string) =>
            this.hashSensitiveData(item)
          );
        }
      }
    }
    return anonymized;
  }

  insert(key: string, data: T): void {
    const index = this.hashKey(key);
    const anonymized = this.anonymize(data);
    const newEntry: HashEntry<T> = { key, value: anonymized, next: null };

    if (!this.buckets[index]) {
      this.buckets[index] = newEntry;
    } else {
      let current = this.buckets[index];
      while (current) {
        if (current.key === key) {
          current.value = anonymized;
          return;
        }
        if (!current.next) break;
        current = current.next;
      }
      current!.next = newEntry;
    }
    this.size++;

    if (this.size > this.capacity * 0.75) {
      this.resize(this.capacity * 2);
    }
  }

  get(key: string): T | null {
    const index = this.hashKey(key);
    let current = this.buckets[index];
    while (current) {
      if (current.key === key) return current.value;
      current = current.next;
    }
    return null;
  }

  delete(key: string): boolean {
    const index = this.hashKey(key);
    let current = this.buckets[index];
    let prev: HashEntry<T> | null = null;

    while (current) {
      if (current.key === key) {
        if (prev) {
          prev.next = current.next;
        } else {
          this.buckets[index] = current.next;
        }
        this.size--;
        return true;
      }
      prev = current;
      current = current.next;
    }
    return false;
  }

  private resize(newCapacity: number): void {
    const oldBuckets = this.buckets;
    this.capacity = newCapacity;
    this.buckets = new Array(newCapacity).fill(null);
    this.size = 0;

    for (const entry of oldBuckets) {
      let current = entry;
      while (current) {
        this.insert(current.key, current.value);
        current = current.next;
      }
    }
  }

  searchByHashedField(field: string, hashedValue: string): T[] {
    const results: T[] = [];
    for (const entry of this.buckets) {
      let current = entry;
      while (current) {
        if ((current.value as any)[field] === hashedValue) {
          results.push(current.value);
        }
        current = current.next;
      }
    }
    return results;
  }

  getAllPatients(): T[] {
    const results: T[] = [];
    for (const entry of this.buckets) {
      let current = entry;
      while (current) {
        results.push(current.value);
        current = current.next;
      }
    }
    return results;
  }

  getLoadFactor(): number {
    return this.size / this.capacity;
  }

  get entryCount(): number {
    return this.size;
  }

  verifyIntegrity(data: T, field: string, originalValue: string): boolean {
    return this.hashSensitiveData(originalValue) === (data as any)[field];
  }
}
