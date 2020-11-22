'use strict';

export enum APICommand {
  OP_GET_LOCK_VERSION = 1,
  OP_ADD_ADMIN = 2, //Add administrator
  OP_UNLOCK_ADMIN = 3, //The administrator opens the door
  OP_UNLOCK_EKEY = 4, //Guantong users open the door
  OP_SET_KEYBOARD_PASSWORD = 5, //Set the administrator keyboard password
  OP_CALIBRATE_TIME = 6,
  OP_SET_NORMAL_USER_PASSWORD = 7, //Set delete password
  OP_READ_NORMAL_USER_PASSWORD = 8,
  OP_CLEAR_NORMAL_USER_PASSWORD = 9,
  OP_REMOVE_SINGLE_NORMAL_USER_PASSWORD = 10,
  OP_RESET_KEYBOARD_PASSWORD = 11, //Reset keyboard password
  OP_SET_DELETE_PASSWORD = 12,
  OP_LOCK_ADMIN = 13, //Parking lock admin closes the lock
  OP_LOCK_EKEY = 14, //Parking lock EKEY close lock
  OP_RESET_EKEY = 15, //set lockFlag

  /**
   * Initialization password
   */
  OP_INIT_PWD = 16,

  //Set the lock name
  OP_SET_LOCK_NAME = 17,

  //Read door lock time
  OP_GET_LOCK_TIME = 18,

  //reset
  OP_RESET_LOCK = 19,

  /**
   * Add a one-time password, start time and end time are required
   */
  OP_ADD_ONCE_KEYBOARD_PASSWORD = 20,

  /**
   * Add permanent keyboard password, need start time
   */
  OP_ADD_PERMANENT_KEYBOARD_PASSWORD = 21,

  /**
   * Add period password
   */
  OP_ADD_PERIOD_KEYBOARD_PASSWORD = 22,

  /**
   * change Password
   */
  OP_MODIFY_KEYBOARD_PASSWORD = 23,

  /**
   * Delete a single password
   */
  OP_REMOVE_ONE_PASSWORD = 24,

  /**
   * Delete all passwords in the lock
   */
  OP_REMOVE_ALL_KEYBOARD_PASSWORD = 25,

  /**
   * Get operation log
   */
  OP_GET_OPERATE_LOG = 26,

  /**
   * Query device characteristics
   */
  OP_SEARCH_DEVICE_FEATURE = 27,

  /**
   * Query IC card number
   */
  OP_SEARCH_IC_CARD_NO = 28,

  /**
   * Add IC card
   */
  OP_ADD_IC = 29,

  /**
   * Modify the validity period of the IC card
   */
  OP_MODIFY_IC_PERIOD = 30,

  /**
   * Delete IC card
   */
  OP_DELETE_IC = 31,

  /**
   * Clear IC card
   */
  OP_CLEAR_IC = 32,

  /**
   * Set the bracelet KEY
   */
  OP_SET_WRIST_KEY = 33,

  /**
   * Add fingerprint
   */
  OP_ADD_FR = 34,

  /**
   * Modify fingerprint validity period
   */
  OP_MODIFY_FR_PERIOD = 35,

  /**
   * Delete fingerprint
   */
  OP_DELETE_FR = 36,

  /**
   * Clear fingerprint
   */
  OP_CLEAR_FR = 37,

  /**
   * Query the shortest and longest lockout time
   */
  OP_SEARCH_AUTO_LOCK_PERIOD = 38,

  /**
   * Set the blocking time
   */
  OP_SET_AUTO_LOCK_TIME = 39,

  /**
   * Enter upgrade mode
   */
  OP_ENTER_DFU_MODE = 40,

  /**
   * Delete passwords in batch
   */
  OP_BATCH_DELETE_PASSWORD = 41,

  /**
   * Locking function
   */
  OP_LOCK = 42,

  /**
   * Show hidden password
   */
  OP_SHOW_PASSWORD_ON_SCREEN = 43,

  /**
   * Data recovery
   */
  OP_RECOVERY_DATA = 44,

  /**
   * Read password parameters
   */
  OP_READ_PWD_PARA = 45,


  /**
   * Query fingerprint list
   */
  OP_SEARCH_FR = 46,

  /**
   * Query password list
   */
  OP_SEARCH_PWD = 47,

  /**
   * Control remote unlock switch
   */
  OP_CONTROL_REMOTE_UNLOCK = 48,

  /**
   * Get battery
   */
  OP_GET_POW = 49,

  OP_AUDIO_MANAGEMENT = 50,

  OP_REMOTE_CONTROL_DEVICE_MANAGEMENT = 51,

  /**
   * Door sensor operation
   */
  OP_DOOR_SENSOR = 52,

  /**
   * Detection door sensor
   */
  OP_DETECT_DOOR_SENSOR = 53,

  /**
   * Get lock switch status
   */
  OP_GET_LOCK_SWITCH_STATE = 54,

  /**
   * Read device information
   */
  OP_GET_DEVICE_INFO = 55,

  /**
   * Configure NB lock server address
   */
  OP_CONFIGURE_NB_SERVER_ADDRESS = 56,

  OP_GET_ADMIN_KEYBOARD_PASSWORD = 57, //Read the administrator keyboard password

  OP_WRITE_FR = 58, //Write fingerprint data

  OP_QUERY_PASSAGE_MODE = 59,
  OP_ADD_OR_MODIFY_PASSAGE_MODE = 60,
  OP_DELETE_PASSAGE_MODE = 61,
  OP_CLEAR_PASSAGE_MODE = 62,
  OP_FREEZE_LOCK = 63,
  OP_LOCK_LAMP = 64,
  OP_SET_HOTEL_DATA = 65,
  OP_SET_SWITCH = 66,
  OP_GET_SWITCH = 67,
  OP_SET_HOTEL_CARD_SECTION = 68,
  OP_DEAD_LOCK = 69,
  OP_SET_ELEVATOR_CONTROL_FLOORS = 70,
  OP_SET_ELEVATOR_WORK_MODE = 71,
  OP_SET_NB_ACTIVATE_CONFIG = 72,
  OP_GET_NB_ACTIVATE_CONFIG = 73,
  OP_SET_NB_ACTIVATE_MODE = 74,
  OP_GET_NB_ACTIVATE_MODE = 75,
}
