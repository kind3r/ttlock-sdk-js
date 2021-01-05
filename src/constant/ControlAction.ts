'use strict';

export enum ControlAction {
  UNLOCK = 3,
  LOCK = 3 << 1,
  /**
   * Volume gate
   */
  ROLLING_GATE_UP = 1,
  ROLLING_GATE_DOWN = 1 << 1,
  ROLLING_GATE_PAUSE = 1 << 2,
  ROLLING_GATE_LOCK = 1 << 3,
  /**
   *
   */
  HOLD = 3 << 3,
}