'use strict';

import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { AdminType } from "./AdminType";

export declare type PrivateDataType = {
  aesKey: Buffer;
  admin?: AdminType;
  unlockKey?: number;
  adminPasscode?: string;
  pwdInfo?: CodeSecret[];
}