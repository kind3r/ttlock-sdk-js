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
      console.log("Trying to add IC Card");
      console.log();
      console.log();
      lock.on("scanICStart", () => {
        console.log();
        console.log("Ready to scan an IC Card");
        console.log();
      });
      const result = await lock.addICCard('202001010000', '202212312359');
      console.log(result);
      await lock.disconnect();

      process.exit(0);
    }
  });
}

doStuff();