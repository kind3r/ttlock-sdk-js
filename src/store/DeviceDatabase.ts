'use strict';

import { BluetoothLeService } from "../scanner/BluetoothLeService";
import { TTBluetoothDevice } from "../device/TTBluetoothDevice";

/**
 * Store data about devices (parmeters, keys etc)
 */
export class DeviceDatabase {
  private bleService: BluetoothLeService | null = null;
  private devices: Map<string, TTBluetoothDevice> = new Map();

  constructor() {

  }

  /**
   * Load from JSON string
   */
  loadFromJSON(json: string): boolean {
    return true;
  }

  addOrUpdateDevice(device: TTBluetoothDevice): boolean {

    return true;
  }
  /**
   * Convert the database into a JSON string
   */
  toJSON() {

  }
}