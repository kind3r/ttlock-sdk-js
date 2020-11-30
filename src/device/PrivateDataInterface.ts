'use strict';

import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { AdminInterface } from "./AdminInterface";

export declare interface PrivateDataInterface {
  aesKey: Buffer;
  admin?: AdminInterface;
  unlockKey?: number;
  adminPasscode?: string;
  pwdInfo?: CodeSecret[];
}