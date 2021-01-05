'use strict';

const { TTLockClient, sleep, CommandEnvelope } = require('../dist');

// const uuids = [];
const api = new TTLockClient({
  // uuids: uuids,
  // scannerType: "noble"
});

async function doStuff() {
  api.prepareBTService();
  for (let i = 10; i > 0; i--) {
    console.log("Starting scan...", i);
    await sleep(1000);
  }
  api.startScanLock();
  console.log("Scan started");
  api.on("foundLock", async (device) => {
    await device.connect();
    // don't disconnect so we receive subscriptions
    // await device.disconnect();
    console.log(device.toJSON());
    console.log();

    if (!device.isInitialized()) {
      console.log("Trying to init the lock");
      console.log();
      console.log();
      const inited = await device.initLock();
      if (!inited) {
        process.exit(1);
      }
      await device.disconnect();
      console.log();
      console.log();
      console.log(device.toJSON());
      console.log();
      console.log();
      console.log("Sleeping 10 seconds");
      await sleep(10000);
      console.log("Reseting to factory defaults");
      await device.connect();
      console.log();
      console.log();
      await device.resetLock();
      console.log();
      console.log();
      console.log("Lock reset to factory defaults");
      process.exit(0);
    }
  });
}

// doStuff();

let defaultAes = Buffer.from("987623E8A923A1BB3D9E7D0378124588", "hex");
let aes = Buffer.from("e817e962c7176c296403f646129f362c", "hex");
// let sent = Buffer.from("7f5a0503010001000190aa108419ca5d7ddc8fa963e1118cacf6f26b27", "hex");
let received = Buffer.from("7f5a0503020001000154aa1095a3bd4703fde2b76397587b6ee44b7b28", "hex");
let receivedCommand = CommandEnvelope.createFromRawData(received, aes);
// receivedCommand.buildCommandBuffer();
let cmd = receivedCommand.getCommand();
// console.log(cmd.getData());
console.log(receivedCommand);
console.log(receivedCommand.getCommandType().toString(16), String.fromCharCode(receivedCommand.getCommandType()));
console.log(receivedCommand.getData().toString("hex"));
console.log(cmd.getType());
// console.log(cmd);
// console.log(cmd.getPsFromLock());
// let cmd = commandFromData(receivedCommand.getData());


let data = receivedCommand.getData();
// let data = Buffer.from("140ed0cf86ee2d2d70dd779a28060154283feb3941263687ae30417a9318e137103988e11a13110e0d48f20f013685f67c23d064c2943815e06e8c27ef", "hex");

////////////////////////
// InitPasswordsCommand
// console.log("data length:", data.length);
// console.log("year:", data.readUInt8(0));
// for (let i = 0; i < 10; i++) {
//   const codeSecret = data.subarray(i * 6 + 1, i * 6 + 1 + 6);
//   // console.log(codeSecret);
//   let code = 0;
//   code = codeSecret.readUInt16BE(0) >> 4 & 0xFFFF;
//   // code = codeSecret.readUInt8(0) << 4 & 0xFF;
//   // code = code | (codeSecret.readUInt8(1) >> 4);
//   let sec = Buffer.alloc(8);
//   sec[3] = (codeSecret.readUInt8(1) << 4 & 0xFF) >> 4;
//   codeSecret.copy(sec, 4, 2);
//   console.log("Code:",code, "Secret:", sec.readBigUInt64BE(0).toString());
// }


// console.log(data.toString());

// for (let i = 0; i < 10; i++) {
//   console.log(data.readUInt8(i));
// }
// console.log(data.readUInt32BE(0), data.readUInt32BE(4), data.subarray(8).toString());
// console.log(data.toString());

// console.log(data.subarray(0, 5));
// console.log(data.subarray(5, 5));
// const data2 = Buffer.alloc(4);
// data.copy(data2, 1, 10, 13);
// console.log(data2.readUInt32BE(0));
// console.log(data.readUInt32BE(0));
