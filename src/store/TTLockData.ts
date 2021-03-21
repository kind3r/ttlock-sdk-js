'use strict';

import { LogEntry } from "../api/Commands";
import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { AdminType } from "../device/AdminType";

export interface TTLockPrivateData {
  aesKey?: string;
  admin?: AdminType;
  adminPasscode?: string;
  pwdInfo?: CodeSecret[];
}

export interface TTLockData {
  /** MAC address */
  address: string;
  /** Battery level */
  battery: number;
  /** Signal */
  rssi: number;
  /** Auto lock time in seconds */
  autoLockTime: number;
  /** -1 unknown, 0 locked, 1 unlocked */
  lockedStatus: number;
  /** Lock private data */
  privateData: TTLockPrivateData;
  /** Operation Log entries */
  operationLog?: LogEntry[];
}