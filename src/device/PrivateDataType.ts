'use strict';

import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { AdminType } from "./AdminType";

export type PrivateDataType = {
  aesKey?: Buffer;
  admin?: AdminType;
  adminPasscode?: string;
  pwdInfo?: CodeSecret[];
}