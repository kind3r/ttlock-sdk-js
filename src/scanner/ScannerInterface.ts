'use strict';

import { EventEmitter } from "events";
import { DeviceInterface } from "./DeviceInterface";

export type ScannerType = "noble" | "noble-websocket";

export type ScannerOptions = {
  websocketHost?: string,
  websocketPort?: number,
  websocketAesKey?: string,
  websocketUsername?: string,
  websocketPassword?: string
}

export type ScannerStateType = "unknown" | "starting" | "scanning" | "stopping" | "stopped";

export interface ScannerInterface extends EventEmitter {
  scannerState: ScannerStateType;
  startScan(passive: boolean): Promise<boolean>;
  stopScan(): Promise<boolean>;
  getState(): ScannerStateType;
  on(event: "ready", listener: () => void): this;
  on(event: "discover", listener: (device: DeviceInterface) => void): this;
  on(event: "scanStart", listener: () => void): this;
  on(event: "scanStop", listener: () => void): this;
}