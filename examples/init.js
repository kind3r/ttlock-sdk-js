'use strict';

const { TTLockClient, sleep } = require('../dist');
const settingsFile = "lockData.json";

async function doStuff() {
  let lockData = await require("./common/loadData")(settingsFile);
  let options = require("./common/options")(lockData);

  const client = new TTLockClient(options);
  await client.prepareBTService();
  // for (let i = 10; i > 0; i--) {
  //   console.log("Starting scan...", i);
  //   await sleep(1000);
  // }
  client.startScanLock();
  console.log("Scan started");
  client.on("foundLock", async (lock) => {
    console.log(lock.toJSON());
    console.log();
    
    if (!lock.isInitialized()) {
      await lock.connect();
      console.log("Trying to init the lock");
      console.log();
      console.log();
      const inited = await lock.initLock();
      await lock.disconnect();

      await require("./common/saveData")(settingsFile, client.getLockData());

      process.exit(0);
    }
  });
}

doStuff();