#!/usr/bin/env node

import { init, snap } from "./mvcs.js";

const func = process.argv[2];
try {
  switch (func) {
    case "ping":
      pong();
      break;

    case "init":
      init();
      break;

    case "snap":
      const msg = process.argv[3] ?? "Project snapshot";
      snap(msg);
      break;

    default:
      console.log("Unknown command");
      break;
  }
} catch (error) {
  if (error instanceof Error) {
    console.log("And error occured");
    console.error(error.message);
  }
}

function pong() {
  console.log("Pong!");
}
