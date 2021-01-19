# ttlock-sdk-js

The goal of this project is to make a partial JavaScript port of the TTLock Android SDK enough to make it work with the biometric locks.  

> This is just an SDK providing the means to communicate with the locks, it is not an app providing the full functionality of the TTLock app. If you are looking for an implementation please see [ttlock-hass-integration](https://github.com/kind3r/hass-addons) Home Assistant Addon.  

> Bluetooth implementation is using [@abandonware/noble](https://github.com/abandonware/noble) but other implementations are possible by extending [ScannerInterface](./src/scanner/ScannerInterface.ts)  

Feeling generous and want to support my work, here is [my PayPal link](https://paypal.me/kind3r).  

## Requirements
- node.js v12 or newer
- a bluetooth adapter on any platform* that [@abandonware/noble](https://github.com/abandonware/noble#installation) works on

> *) It was tested on a Raspberry PI 3 running Debian and also under Home Assistant runing on an Intel NUC

## Implemented features
- [X] discover locks
- [X] initialize (pair) locks
- [X] reset to factory defaults
- [X] lock
- [X] unlock
- [X] get lock/unlock status
- [X] set/get autolock time
- [X] add/edit/delete/clear passage mode
- [X] add/edit/remove keyboard passwords (PIN codes)
- [X] add/edit/remove fingerprints
- [X] add/edit/remove IC Cards 

## Planned development
- [ ] add some logger to separate debug events from normal ones
- [ ] proper timezone support
- [ ] cyclic based validity setup for credentials (ex.: Mo-Fr from 9AM to 5PM)
- [ ] get open/close logs
- [ ] API documentation
- [ ] receive lock/unlock events*

> *) Receiving events is not possible at the moment as the Android SDK does not have this implemented (for obvious reasons, the phone is not always connected to the lock via BLE). It should be possible to analize the gateway and extract the commands required to activate the events.

## **Known issues and limitations**
- Pairing the lock can sometimes fail. It is recommended to pair the lock before installing it on the door so you can use the button on the back to factory reset it.
- BLE signal is generaly bad, at least combined with the PI 3. Sometimes commands fail because of this (presumption).
- Editing validity intervals of fingerprints and IC Cards does not work. *Perhaps it is required to remove and re-add*.
- Some commands always have a bad CRC.
- The SDK only works with locks that use the V3 protocol for communication.

## Gateway option

The websocket binding present in [@abandonware/noble](https://github.com/abandonware/noble) was extended with a simple authentication via AES key, user and password. This adds basic suport for using a bluetooth adapter on a remote host via a simple websocket connection. The end goal will be to run an ESP32 as a gateway (development ongoing) to extend the range of the device the SDK is running on, or maybe just use it on a device that does not even have a bluetooth adapter. A sample server is implemented in [tools/server.js](./tools/server.js). All examples in the SKD can be started in websocket mode by adding the following environment variables:
- `WEBSOCKET_DEBUG=1` - debug websocket messages
- `WEBSOCKET_ENABLE=1` - this will enable websocket support
- `WEBSOCKET_HOST=127.0.0.1` - the IP or hostname of the host running the server
- `WEBSOCKET_PORT=2846` - the port the server is running on

For example:
```sh
pi@raspberrypi:~/ttlock-sdk-js $ WEBSOCKET_ENABLE=1 WEBSOCKET_HOST=192.168.1.42 npm run get-cards
```

## Debug options

- `TTLOCK_IGNORE_CRC=1` - Ignore CRC error on messages received from the lock
- `TTLOCK_DEBUG_COMM=1` - Log raw lock communication messages  
 

## Sample usage of this SDK

1. Clone the repo and install the dependencies `npm i`.
2. Check the installation prerequisites for your OS on the [@abandonware/noble](https://github.com/abandonware/noble#installation) GitHub page. Make sure you also read the [Running without root/sudo (Linux-specific)](https://github.com/abandonware/noble#running-without-rootsudo-linux-specific) section for running without sudo.  

The code for the followinng examples are located in the [examples](./examples) folder.

### Initialisation

`npm run init` - performs the initial pairing with the lock.

The lock needs to be reset to factory defaults and it needs to be woke up by touching the keyboard. The lock stays alive for 10-15s and only in that interval it is discoverable so you need to time this right.

> If the lock is woke up after the scan has started it won't be found.  

> If the lock is woke up too early, it can go back to sleep before the init process is completed.  

> The init script provides a countdown of 10 seconds, waking up the lock 5 seconds before the scan start proved to be most reliable. 

After the initialisation is completed, the script ouputs the credentials for the lock into the `lockData.json` file. This file is used by the other scripts.

**Sometimes the pairing process fails** for reasons that are not quite clear. The pairing process has to be repeated until it succedes. Possible causes of failure are:
- the lock is too close to the PI
- something wrong in the BLE library used
- drivers

In case the lock needs to be reseted to factory defaults, there is a switch on the back of the part that goes on the outside. Removing the metal cover will reveal this switch. Short pressing the switch will reboot the lock (one beep), long pressing for about 2-3 seconds will reset the lock to factory defaults (two beeps).

### Lock/Unlock

`npm run unlock` - unlock the lock  
`npm run lock` - lock the lock

Those 2 scripts read the lock credentials from `lockData.json` file generated by the init script, start searching for the lock and connect to it. Once the known lock is found and connected they perform the lock/unlock command. 

Bu default, auto locking is set for 5 seconds. So after unlocking, it will auto lock back.

### Lock status

`npm run status` - returns the lock or unlock status  

### Passage mode

Passage mode disables autolock for the intervals you set. All unlock metods are now treated as toggle (lock/unlock) instead of just unlock and locking back after the autolock timeout. 

`npm run set-passage` - sets passage mode for friday all day  
`npm run get-passage` - gets the passage mode intervals  
`npm run delete-passage` - deletes the passage mode for friday all day  
`npm run clear-passage` - deletes all passage mode intervals

### Reset to factory defaults

`npm run reset` - resets the lock to factory defaults

Performs a soft reset of the lock to factory data. The credentials file `lockData.json` is automatically updated and the reseted lock is removed.

### Passcodes management

Passcodes or keyboard passcodes or pin codes allow oppening the lock using a 4-8 digits code. The passcodes can be permanent, one time, or limited time. 

`npm run add-passcode` - sets a permanent passcode **123456** available all the time  
`npm run update-passcode` - updates the permanent passcode **123456** to **654321**  
`npm run delete-passcode` - deletes the permanent passcode **654321**  
`npm run clear-passcodes` - removes all passcodes  

### IC Card management

IC cards are scanned and their serial number is returned. You can then add validity intervals for that card serial number. Also works with credit cards. 

`npm run add-card` - scans a card and adds a permanent validity  
`npm run get-cards` - lists all the valid cards and their intervals  
`npm run clear-cards` - removes all registered cards  

### Fingerprint management

Fingerprints are scanned mutiple times during the add process. After scanning you can add validity intervals for that fingerprint.

`npm run add-fingerprint` - scans a fingerprint and adds a permanent validity (it will timeout after 8.5 seconds if you do not scan a finger)  
`npm run get-fingerprints` - lists all valid fingerprints and their intervals  
`npm run clear-fingerprints` - removes all registered fingerprints  

## Credits

- [Valentino Stillhardt (@Fusseldieb)](https://github.com/Fusseldieb) for initial protocol analysis and providing remote access to his lock

## License

[GPL-3.0](LICENSE)