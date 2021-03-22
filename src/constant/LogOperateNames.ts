'use strict';

import { LogOperate } from "./LogOperate";

export let LogOperateNames: string[] = [];
LogOperateNames[LogOperate.OPERATE_TYPE_MOBILE_UNLOCK] = "Bluetooth unlock";
// //Server unlock
// OPERATE_TYPE_SERVER_UNLOCK = 3;
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_UNLOCK] = "Password unlock";
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_MODIFY_PASSWORD] = "Change the password on the keyboard";
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_SINGLE_PASSWORD] = "Delete a single password on the keyboard";
LogOperateNames[LogOperate.OPERATE_TYPE_ERROR_PASSWORD_UNLOCK] = "Wrong password unlock";
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_REMOVE_ALL_PASSWORDS] = "Delete all passwords on the keyboard";
LogOperateNames[LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_KICKED] = "The password is squeezed out";
LogOperateNames[LogOperate.OPERATE_TYPE_USE_DELETE_CODE] = "The password with the delete function is unlocked for the first time; and the previous password is cleared";
LogOperateNames[LogOperate.OPERATE_TYPE_PASSCODE_EXPIRED] = "Password expired";
LogOperateNames[LogOperate.OPERATE_TYPE_SPACE_INSUFFICIENT] = "The password unlock failed; and the storage capacity is insufficient";
LogOperateNames[LogOperate.OPERATE_TYPE_PASSCODE_IN_BLACK_LIST] = "Password unlock failed—the password is in the blacklist";
LogOperateNames[LogOperate.OPERATE_TYPE_DOOR_REBOOT] = "The door lock is powered on again (that is; the battery is reconnected)";
LogOperateNames[LogOperate.OPERATE_TYPE_ADD_IC] = "Add IC card successfully";
LogOperateNames[LogOperate.OPERATE_TYPE_CLEAR_IC_SUCCEED] = "Successfully emptied the IC card";
LogOperateNames[LogOperate.OPERATE_TYPE_IC_UNLOCK_SUCCEED] = "IC card opened successfully";
LogOperateNames[LogOperate.OPERATE_TYPE_DELETE_IC_SUCCEED] = "Delete a single IC card successfully";
LogOperateNames[LogOperate.OPERATE_TYPE_BONG_UNLOCK_SUCCEED] = "Bong bracelet opened the door successfully";
LogOperateNames[LogOperate.OPERATE_TYPE_FR_UNLOCK_SUCCEED] = "Fingerprint opens the door successfully";
LogOperateNames[LogOperate.OPERATE_TYPE_ADD_FR] = "The fingerprint is added successfully";
LogOperateNames[LogOperate.OPERATE_TYPE_FR_UNLOCK_FAILED] = "Fingerprint opening failed";
LogOperateNames[LogOperate.OPERATE_TYPE_DELETE_FR_SUCCEED] = "Delete a single fingerprint successfully";
LogOperateNames[LogOperate.OPERATE_TYPE_CLEAR_FR_SUCCEED] = "Clear fingerprints successfully";
LogOperateNames[LogOperate.OPERATE_TYPE_IC_UNLOCK_FAILED] = "IC card failed to open the door-expired or not valid";
LogOperateNames[LogOperate.OPERATE_BLE_LOCK] = "Bluetooth or net closed lock";
LogOperateNames[LogOperate.OPERATE_KEY_UNLOCK] = "Mechanical key unlock";
LogOperateNames[LogOperate.GATEWAY_UNLOCK] = "Gateway unlock";
LogOperateNames[LogOperate.ILLAGEL_UNLOCK] = "Illegal unlocking (such as pedaling)";
LogOperateNames[LogOperate.DOOR_SENSOR_LOCK] = "Close the door sensor";
LogOperateNames[LogOperate.DOOR_SENSOR_UNLOCK] = "Door sensor open";
LogOperateNames[LogOperate.DOOR_GO_OUT] = "Outgoing records";
LogOperateNames[LogOperate.FR_LOCK] = "Fingerprint lock";
LogOperateNames[LogOperate.PASSCODE_LOCK] = "Password lock";
LogOperateNames[LogOperate.IC_LOCK] = "IC card lock";
LogOperateNames[LogOperate.OPERATE_KEY_LOCK] = "Mechanical key lock";
LogOperateNames[LogOperate.REMOTE_CONTROL_KEY] = "Remote control button";
LogOperateNames[LogOperate.PASSCODE_UNLOCK_FAILED_LOCK_REVERSE] = "Password unlock failed; the door is locked";
LogOperateNames[LogOperate.IC_UNLOCK_FAILED_LOCK_REVERSE] = "The IC card fails to unlock and the door is locked";
LogOperateNames[LogOperate.FR_UNLOCK_FAILED_LOCK_REVERSE] = "Fingerprint unlocking fails; the door is locked";
LogOperateNames[LogOperate.APP_UNLOCK_FAILED_LOCK_REVERSE] = "The app fails to unlock and the door is locked";
//42 ~ 48 no parameters
LogOperateNames[LogOperate.WIRELESS_KEY_FOB] = "Wireless key";
LogOperateNames[LogOperate.WIRELESS_KEY_PAD] = "Wireless keyboard battery";

// export default LogOperateNames;