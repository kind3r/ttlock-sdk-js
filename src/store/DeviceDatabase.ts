'use strict';

import { ExtendedBluetoothDevice } from "../scanner/ExtendedBluetoothDevice";
import { BluetoothLeService } from "../scanner/BluetoothLeService";

/**
 * Store data about devices (parmeters, keys etc)
 */
export class DeviceDatabase {
  private bleService: BluetoothLeService | null = null;
  private devices: Map<string, ExtendedBluetoothDevice> = new Map();

  constructor() {

  }

  /**
   * Load from JSON string
   */
  loadFromJSON(json: string): boolean {
    return true;
  }

  addOrUpdateDevice(device: ExtendedBluetoothDevice): boolean {

    return true;
  }
  /**
   * Convert the database into a JSON string
   */
  toJSON() {

  }
}