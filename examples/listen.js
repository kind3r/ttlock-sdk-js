'use strict';

const { TTLockClient, sleep } = require('../dist');
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
    })

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
      console.log();
      console.log();
    }
  });
}

doStuff();