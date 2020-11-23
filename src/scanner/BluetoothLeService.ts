'use strict';

import { EventEmitter } from "events";
import { ScannerInterface, ScannerType } from "./ScannerInterface";
import { NobleScanner } from "./NobleScanner";
import { NodeBleScanner } from "./NodeBleScanner";
import { ExtendedBluetoothDevice } from "./ExtendedBluetoothDevice";

export { ScannerType } from "./ScannerInterface";
export const TTLockUUIDs: string[] = ["1910", "00001910-0000-1000-8000-00805f9b34fb"];

export declare interface BluetoothLeService {
  on(event: "discover", listener: (device: ExtendedBluetoothDevice) => void): this;
}

export class BluetoothLeService extends EventEmitter implements BluetoothLeService {
  private scanner: ScannerInterface;

  constructor(uuids: string[] = TTLockUUIDs, scannerType: ScannerType = "auto") {
    super();
    if (scannerType == "auto") {
      scannerType = "noble";
    }
    if (scannerType == "noble") {
      this.scanner = new NobleScanner(uuids);
      this.scanner.on("discover", this.onDiscover.bind(this));
    } else if (scannerType == "node-ble") {
      this.scanner = new NodeBleScanner(uuids);
    } else {
      throw "Invalid parameters";
    }
  }

  startScan(): boolean {
    return this.scanner.startScan();
  }

  stopScan(): boolean {
    return this.scanner.stopScan();
  }

  private onDiscover(device: ExtendedBluetoothDevice) {
    this.emit("discover", device);
  }
}