'use strict';

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

export class LockVersion {

  static lockVersion_V2S_PLUS: LockVersion = new LockVersion(5, 4, 1, 1, 1);
  static lockVersion_V3: LockVersion = new LockVersion(5, 3, 1, 1, 1);
  static lockVersion_V2S: LockVersion = new LockVersion(5, 1, 1, 1, 1);
  /**
   *The second-generation parking lock scene is also changed to 7
   */
  static lockVersion_Va: LockVersion = new LockVersion(0x0a, 1, 0x07, 1, 1);
  /**
   *The electric car lock scene will be changed to 1 and there is no electric car lock
   */
  static lockVersion_Vb: LockVersion = new LockVersion(0x0b, 1, 0x01, 1, 1);
  static lockVersion_V2: LockVersion = new LockVersion(3, 0, 0, 0, 0);
  static lockVersion_V3_car: LockVersion = new LockVersion(5, 3, 7, 1, 1);

  private protocolType: number;
  private protocolVersion: number;
  private scene: number;
  private groupId: number;
  private orgId: number;

  constructor(protocolType: number, protocolVersion: number, scene: number, groupId: number, orgId: number) {
    this.protocolType = protocolType;
    this.protocolVersion = protocolVersion;
    this.scene = scene;
    this.groupId = groupId;
    this.orgId = orgId;
  }

  getProtocolType(): number {
    return this.protocolType;
  }
  setProtocolType(protocolType: number): void {
    this.protocolType = protocolType;
  }
  getProtocolVersion(): number {
    return this.protocolVersion;
  }
  setProtocolVersion(protocolVersion: number): void {
    this.protocolVersion = protocolVersion;
  }
  getScene(): number {
    return this.scene;
  }
  setScene(scene: number): void {
    this.scene = scene;
  }
  getGroupId(): number {
    return this.groupId;
  }
  setGroupId(groupId: number): void {
    this.groupId = groupId;
  }
  getOrgId(): number {
    return this.orgId;
  }
  setOrgId(orgId: number): void {
    this.orgId = orgId;
  }

  static getLockVersion(lockType: LockType): LockVersion | null {
    switch (lockType) {
      case LockType.LOCK_TYPE_V3_CAR:
        return LockVersion.lockVersion_V3_car;
      case LockType.LOCK_TYPE_V3:
        return LockVersion.lockVersion_V3;
      case LockType.LOCK_TYPE_V2S_PLUS:
        return LockVersion.lockVersion_V2S_PLUS;
      case LockType.LOCK_TYPE_V2S:
        return LockVersion.lockVersion_V2S;
      case LockType.LOCK_TYPE_CAR:
        return LockVersion.lockVersion_Va;
      case LockType.LOCK_TYPE_MOBI:
        return LockVersion.lockVersion_Vb;
      case LockType.LOCK_TYPE_V2:
        return LockVersion.lockVersion_V2;
      default:
        return null;
    }
  }

  toString(): string {
    return this.protocolType + "," + this.protocolVersion + "," + this.scene + "," + this.groupId + "," + this.orgId;
  }

}
