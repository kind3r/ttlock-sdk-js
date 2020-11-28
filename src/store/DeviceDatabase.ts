'use strict';

import { TTLock } from "../device/TTLock";

/**
 * Store data about devices (parmeters, keys etc)
 */
export class DeviceDatabase {
  private locks: Map<string, TTLock> = new Map();

  constructor() {

  }

  /**
   * Load from JSON string
   */
  loadFromJSON(json: string): boolean {
    return true;
  }

  addOrUpdateDevice(lock: TTLock): boolean {
    this.locks.set(lock.getId(), lock);
    return true;
  }
  /**
   * Convert the database into a JSON string
   */
  toJSON() {

  }
}