'use strict';

import events from "events";
import { ExtendedBluetoothDevice } from "./ExtendedBluetoothDevice";

export declare type ScannerType = "noble" | "node-ble" | "auto";

export declare type ScannerStateType = "unknown" | "starting" | "scanning" | "stopping" | "stopped";

export declare interface ScannerInterface extends events.EventEmitter {
  scannerState: ScannerStateType;
  startScan(): boolean;
  stopScan(): boolean;
  on(event: "discover", listener: (device: ExtendedBluetoothDevice) => void): this;
}