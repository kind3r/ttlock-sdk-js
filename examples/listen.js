'use strict';

const { TTLockClient, LogOperate, LockedStatus } = require('../dist');
const settingsFile = "lockData.json";

async function doStuff() {
  let lockData = await require("./common/loadData")(settingsFile);
  let options = require("./common/options")(lockData);

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startMonitor();
  console.log("Scan started");
  client.on("foundLock", async (lock) => {
    console.log(lock.toJSON());
    console.log();

    lock.on("locked", (l) => {
      console.log("Lock was locked");
    });

    lock.on("unlocked", (l) => {
      console.log("Lock was unlocked");
    });

    lock.on("updated", async (l, p) => {
      if (p.newEvents && l.hasNewEvents()) {
        if (!l.isConnected()) {
          console.log("Reconnecting to lock to read log");
          const res = await l.connect();
          if (res == false) {
            console.log("Unable to connect to lock");
            process.exit(2);
          }
        }
        let operations = await l.getOperationLog();
        console.log(operations);
        for (let op of operations) {
          switch (op.recordType) {
            case LogOperate.OPERATE_TYPE_MOBILE_UNLOCK:
            case LogOperate.OPERATE_TYPE_KEYBOARD_PASSWORD_UNLOCK:
            case LogOperate.OPERATE_TYPE_IC_UNLOCK_SUCCEED:
            case LogOperate.OPERATE_TYPE_BONG_UNLOCK_SUCCEED:
            case LogOperate.OPERATE_TYPE_FR_UNLOCK_SUCCEED:
            case LogOperate.OPERATE_KEY_UNLOCK:
            case LogOperate.GATEWAY_UNLOCK:
            case LogOperate.ILLAGEL_UNLOCK:
            case LogOperate.DOOR_SENSOR_UNLOCK:
              // unlock event
              console.log(">>>>>> Lock was unlocked <<<<<<");
              break;
            default:
            // not unlock event
          }
        }
        const status = await l.getLockStatus();
        if (status == LockedStatus.LOCKED) {
          console.log(">>>>>> Lock is now locked <<<<<<");
        } else if (status == LockedStatus.UNLOCKED) {
          console.log(">>>>>> Lock is now unlocked <<<<<<");
        }
      }
      if (p.lockedStatus) {
        const status = await l.getLockStatus();
        if (status == LockedStatus.LOCKED) {
          console.log(">>>>>> Lock is now locked from new event <<<<<<");
        }
      }

      await l.disconnect();
    });

    if (lock.isInitialized() && lock.isPaired()) {
      lock.on("disconnected", () => {
        // setTimeout(() => {
        //   lock.connect();
        // }, 3000);
        // client.startScanLock();
        console.log("Disconnected from a known lock");
        client.startMonitor();
      });
      await lock.connect();
      console.log("Connected to a known lock");
      // make sure operation log is up to date
      await lock.getOperationLog();
      console.log();
      console.log();
    }
  });

  // save lock data changes
  client.on("updatedLockData", async () => {
    await require("./common/saveData")(settingsFile, client.getLockData());
  });
}

doStuff();