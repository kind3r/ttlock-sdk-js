'use strict';

import { EventEmitter } from "events";
import { DeviceInterface } from "./DeviceInterface";

export declare type ScannerType = "noble" | "node-ble" | "auto";

export declare type ScannerStateType = "unknown" | "starting" | "scanning" | "stopping" | "stopped";

export declare interface ScannerInterface extends EventEmitter {
  scannerState: ScannerStateType;
  startScan(): Promise<boolean>;
  stopScan(): Promise<boolean>;
  on(event: "discover", listener: (device: DeviceInterface) => void): this;
}