'use strict';

const { TTLockClient, sleep, PassageModeType, AudioManage } = require('../dist');
const settingsFile = "lockData.json";

async function doStuff() {
  let lockData = await require("./common/loadData")(settingsFile);
  let options = require("./common/options")(lockData);

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log("Scan started");
  client.on("foundLock", async (lock) => {
    console.log(lock.toJSON());
    console.log();
    
    if (lock.isInitialized() && lock.isPaired()) {
      await lock.connect();
      console.log("Trying to clear lock sound");
      console.log();
      console.log();
      const result = await lock.setLockSound(AudioManage.TURN_OFF);
      console.log(result);
      await lock.disconnect();

      process.exit(0);
    }
  });
}

doStuff();