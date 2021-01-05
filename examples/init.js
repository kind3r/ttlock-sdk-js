'use strict';

const { TTLockClient, sleep } = require('../dist');
const fs = require('fs/promises');
const settingsFile = "lockData.json";

async function doStuff() {
  let lockData;
  try {
    await fs.access(settingsFile);
    const lockDataTxt = (await fs.readFile(settingsFile)).toString();
    lockData = JSON.parse(lockDataTxt);
  } catch (error) {}

  const client = new TTLockClient({
    lockData: lockData
  });
  await client.prepareBTService();
  for (let i = 10; i > 0; i--) {
    console.log("Starting scan...", i);
    await sleep(1000);
  }
  client.startScanLock();
  console.log("Scan started");
  client.on("foundLock", async (lock) => {
    await lock.connect();
    console.log(lock.toJSON());
    console.log();

    if (!lock.isInitialized()) {
      console.log("Trying to init the lock");
      console.log();
      console.log();
      const inited = await lock.initLock();
      await lock.disconnect();
      const newLockData = client.getLockData();
      console.log(JSON.stringify(newLockData));
      try {
        await fs.writeFile(settingsFile, Buffer.from(JSON.stringify(newLockData)));
      } catch (error) {
        process.exit(1);
      }

      process.exit(0);
    }
  });
}

doStuff();