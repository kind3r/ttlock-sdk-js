'use strict';

import events from "events";
import { ScannerInterface, ScannerType } from "./ScannerInterface";
import { NobleScanner } from "./NobleScanner";
import { NodeBleScanner } from "./NodeBleScanner";
import { ExtendedBluetoothDevice } from "./ExtendedBluetoothDevice";

export { ScannerType } from "./ScannerInterface";
export const TTLockUUIDs: string[] = ["00001910-0000-1000-8000-00805f9b34fb"];

export class BluetoothLeService extends events.EventEmitter {
  private scanner: ScannerInterface;

  constructor(uuids: string[] = TTLockUUIDs, scannerType: ScannerType = "auto") {
    super();
    if (scannerType == "auto") {
      scannerType = "noble";
    }
    if (scannerType == "noble") {
      this.scanner = new NobleScanner(uuids);
      this.scanner.on("discover", (device: ExtendedBluetoothDevice) => {
        this.emit("discover", device);
      });
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
}