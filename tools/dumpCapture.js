const fs = require('fs');
csv = require('node-csv').createParser();
const chalk = require('chalk');
const { TTLockClient, sleep, CommandEnvelope, CommandType } = require('../dist');

let isAesNext = false;
let aes = Buffer.from([
  0x98, 0x76, 0x23, 0xE8,
  0xA9, 0x23, 0xA1, 0xBB,
  0x3D, 0x9E, 0x7D, 0x03,
  0x78, 0x12, 0x45, 0x88
]);

csv.parseFile('docs/export_mhacroms_raw.csv', function(err, input) {
  // console.log(input);
  var data = "";
  var dir = "";
  var counter = 0;
  for(const row of input) {
    // console.log(row);
    if (counter > 0) { // ignore first row
      if (row[1] != dir) {
        if (data != "") {
          console.log(chalk.red("Leftover data"), dir, data);
          console.log("");
        }
        data = "";
        dir = row[1];
      }
      data += row[0];
      if (data.substring(data.length - 4, data.length) == "0d0a") {
        // process
        // console.log("Process", dir, data);
        process(data, dir);
        // clear
        data = "";
      }
    }
    counter++;
  };
});

function process(data, dir) {
  try {
    let strippedData = JSON.parse(JSON.stringify(data.substring(0, data.length - 4)));
    let binData = Buffer.from(strippedData, "hex");
    if (dir == "Rcvd") {
      console.log(chalk.green("Rcvd: " + binData.toString("hex")));
    } else {
      console.log(chalk.cyan("Sent: " + binData.toString("hex")));
    }
    let envelope = CommandEnvelope.createFromRawData(binData, aes);
    if (dir == "Rcvd") {
      let command;
      try {
        command = envelope.getCommand();
        if (envelope.commandType == 25) {
          aes = command.aesKey;
        }
        console.log(command);
      } catch (error) {
        console.log(envelope);
      }
    } else {
      // console.log(envelope);
      console.log("Command type: 0x" + envelope.getCommandType().toString(16));
      console.log("Command data: " + envelope.getData().toString("hex"));
    }
    console.log("");

  } catch (error) {
    console.error(error);
  }
}