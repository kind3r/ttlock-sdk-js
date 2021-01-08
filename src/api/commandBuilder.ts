'use strict';

import { CommandType } from "../constant/CommandType";
import { Command, CommandInterface } from "./Command";
import * as commands from "./Commands";

// TODO: index commands based on COMMAND_TYPE for faster lookup

function getCommandClass(commandType: CommandType): CommandInterface | void {
  let commandTypeInt = commandType;
  // if (typeof commandTypeInt == "string") {
  //   commandTypeInt = commandTypeInt.charCodeAt(0);
  // }
  const classNames = Object.keys(commands);
  for (let i = 0; i < classNames.length; i++) {
    if (classNames[i] != "UnknownCommand") {
      const commandClass: CommandInterface = Reflect.get(commands, classNames[i]);
      let cmdTypeInt = commandClass.COMMAND_TYPE;
      // if (typeof cmdTypeInt == 'string') {
      //   cmdTypeInt = cmdTypeInt.charCodeAt(0);
      // }
      if (cmdTypeInt == commandTypeInt) {
        return commandClass;
      }
    }
  }
}

export function commandFromData(data: Buffer): Command {
  const commandType: CommandType = data.readUInt8(0);
  const commandClass = getCommandClass(commandType);
  if (commandClass) {
    return Reflect.construct(commandClass, [data]);
  } else {
    return new commands.UnknownCommand(data);
  }
}

export function commandFromType(commandType: CommandType): Command {
  const commandClass = getCommandClass(commandType);
  if (commandClass) {
    return Reflect.construct(commandClass, []);
  } else {
    return new commands.UnknownCommand();
  }
}