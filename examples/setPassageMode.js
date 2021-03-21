'use strict';

const { TTLockClient, sleep, PassageModeType } = require('../dist');
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
      console.log("Trying to set passage mode");
      console.log();
      console.log();
      const result = await lock.setPassageMode({
        type: PassageModeType.WEEKLY,
        weekOrDay: 5,
        month: 0,
        startHour: "0000",
        endHour: "2359"
      });
      await lock.disconnect();

      process.exit(0);
    }
  });
}

doStuff();