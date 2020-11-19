'use strict';

// export class LockType {
//   static LOCK_TYPE_V1:number = 1;
//   /** 3.0 */
//   static LOCK_TYPE_V2:number = 2;
//   /** 5.1 */
//   static LOCK_TYPE_V2S:number = 3;
//   /** 5.4 */
//   static LOCK_TYPE_V2S_PLUS:number = 4;
//   /** Third generation lock 5.3 */
//   static LOCK_TYPE_V3:number = 5;
//   /** Parking lock a.1 */
//   static LOCK_TYPE_CAR:number = 6;
//   /** Third generation parking lock 5.3.7 */
//   static LOCK_TYPE_V3_CAR:number = 8;
//   /** Electric car lock b.1 */
//   static LOCK_TYPE_MOBI:number = 7;

// //    /** Remote control equipment 5.3.10 */
// //    static LOCK_TYPE_REMOTE_CONTROL_DEVICE:number = 9;
// //    /** safe lock */
// //    static LOCK_TYPE_SAFE_LOCK:number = 8;
// //    /** bicycle lock */
// //    static LOCK_TYPE_BICYCLE:number = 9;
// }

export enum LockType {
  UNKNOWN = 0,
  LOCK_TYPE_V1 = 1,
  /** 3.0 */
  LOCK_TYPE_V2 = 2,
  /** 5.1 */
  LOCK_TYPE_V2S = 3,
  /** 5.4 */
  LOCK_TYPE_V2S_PLUS = 4,
  /** Third generation lock 5.3 */
  LOCK_TYPE_V3 = 5,
  /** Parking lock a.1 */
  LOCK_TYPE_CAR = 6,
  /** Third generation parking lock 5.3.7 */
  LOCK_TYPE_V3_CAR = 8,
  /** Electric car lock b.1 */
  LOCK_TYPE_MOBI = 7,

//    /** Remote control equipment 5.3.10 */
//    static LOCK_TYPE_REMOTE_CONTROL_DEVICE:number = 9;
//    /** safe lock */
//    static LOCK_TYPE_SAFE_LOCK:number = 8;
//    /** bicycle lock */
//    static LOCK_TYPE_BICYCLE:number = 9;
}