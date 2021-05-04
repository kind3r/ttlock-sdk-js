'use strict';

const { TTLockClient, sleep, PassageModeType } = require('../dist');
const settingsFile = "lockData.json";

const cards = [
  ['202001010000', '202212312359', '1234567890']
];

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
      console.log("Trying to add IC Cards");
      console.log();
      console.log();
      for (const card of cards) {
        console.log("Adding card", card[2]);
        const result = await lock.addICCard(card[0], card[1], card[2]);
        console.log(result);
      }
      await lock.disconnect();

      process.exit(0);
    }
  });
}

doStuff();