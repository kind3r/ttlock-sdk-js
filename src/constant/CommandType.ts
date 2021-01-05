'use strict';

export enum CommandType {
  COMM_INITIALIZATION = 'E',
  COMM_GET_AES_KEY = 0x19,
  COMM_RESPONSE = 'T',

  /**
   * Add management
   */
  COMM_ADD_ADMIN = 'V',

  /**
   * Check the administrator
   */
  COMM_CHECK_ADMIN = 'A',

  /**
   * Administrator keyboard password
   */
  COMM_SET_ADMIN_KEYBOARD_PWD = 'S',

  /**
   * Delete password
   */
  COMM_SET_DELETE_PWD = 'D',

  /**
   * Set the lock name
   */
  COMM_SET_LOCK_NAME = 'N',

  /**
   * Sync keyboard password
   */
  COMM_SYN_KEYBOARD_PWD = 'I',

  /**
   * Verify user time
   */
  COMM_CHECK_USER_TIME = 'U',

  /**
   * Get the parking lock alarm record (the parking lock is moved)
   * To determine the completion of operations such as adding and password
   */
  COMM_GET_ALARM_ERRCORD_OR_OPERATION_FINISHED = 'W',

  /**
   * Open the door
   */
  COMM_UNLOCK = 'G',

  /**
   * close the door
   */
  COMM_LOCK = 'L',

  /**
   * Calibration time
   */
  COMM_TIME_CALIBRATE = 'C',

  /**
   * Manage keyboard password
   */
  COMM_MANAGE_KEYBOARD_PASSWORD = 0x03,

  /**
   * Get a valid keyboard password in the lock
   */
  COMM_GET_VALID_KEYBOARD_PASSWORD = 0x04,

  /**
   * Get operation records
   */
  COMM_GET_OPERATE_LOG = 0x25,

  /**
   * Random number verification
   */
  COMM_CHECK_RANDOM = 0x30,

  /**
   * Three generations
   * Password initialization
   */
  COMM_INIT_PASSWORDS = 0x31,

  /**
   * Read password parameters
   */
  COMM_READ_PWD_PARA = 0x32,

  /**
   * Modify the number of valid keyboard passwords
   */
  COMM_RESET_KEYBOARD_PWD_COUNT = 0x33,

  /**
   * Read door lock time
   */
  COMM_GET_LOCK_TIME = 0x34,

  /**
   * Reset lock
   */
  COMM_RESET_LOCK = 'R',

  /**
   * Query device characteristics
   */
  COMM_SEARCHE_DEVICE_FEATURE = 0x01,

  /**
   * IC card management
   */
  COMM_IC_MANAGE = 0x05,

  /**
   * Fingerprint management
   */
  COMM_FR_MANAGE = 0x06,

  /**
   * Get password list
   */
  COMM_PWD_LIST = 0x07,

  /**
   * Set the bracelet KEY
   */
  COMM_SET_WRIST_BAND_KEY = 0x35,

  /**
   * Automatic locking management (including door sensor)
   */
  COMM_AUTO_LOCK_MANAGE = 0x36,

  /**
   * Read device information
   */
  COMM_READ_DEVICE_INFO = 0x90,

  /**
   * Enter upgrade mode
   */
  COMM_ENTER_DFU_MODE = 0x02,

  /**
   * Query bicycle status (including door sensor)
   */
  COMM_SEARCH_BICYCLE_STATUS = 0x14,

  /**
   * Locked
   */
  COMM_FUNCTION_LOCK = 0x58,

  /**
   * The password is displayed on the screen
   */
  COMM_SHOW_PASSWORD = 0x59,

  /**
   * Control remote unlocking
   */
  COMM_CONTROL_REMOTE_UNLOCK = 0x37,

  COMM_AUDIO_MANAGE = 0x62,

  COMM_REMOTE_CONTROL_DEVICE_MANAGE = 0x63,

  /**
   * For NB networked door locks, through this command, App tells the address information of the door lock server
   */
  COMM_CONFIGURE_NB_ADDRESS = 0x12,

  /**
   * Hotel lock parameter configuration
   */
  COMM_CONFIGURE_HOTEL_DATA = 0x64,

  /**
   * Read the administrator password
   */
  COMM_GET_ADMIN_CODE = 0x65,

  /**
   * Normally open mode management
   */
  COMM_CONFIGURE_PASSAGE_MODE = 0x66,

  /**
   * Switch control instructions (privacy lock, tamper-proof alarm, reset lock)
   */
  COMM_SWITCH = 0x68,

  COMM_FREEZE_LOCK = 0x61,

  COMM_LAMP = 0x67,

  /**
   * Deadlock instruction
   */
  COMM_DEAD_LOCK = 0x69,

  /**
   * Cycle instructions
   */
  COMM_CYCLIC_CMD = 0x70,

  COMM_NB_ACTIVATE_CONFIGURATION = 0x13,
}