import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve("index.html"), "utf-8");
const globalsScript = '<script src="./__neutralino_globals.js"></script>';
const clientScript = '<script src="./neutralino.js"></script>';
const globalsIndex = html.indexOf(globalsScript);
const clientIndex = html.indexOf(clientScript);

if (globalsIndex === -1) {
  throw new Error(`index.html must load ${globalsScript}`);
}

if (clientIndex === -1) {
  throw new Error(`index.html must load ${clientScript}`);
}

if (globalsIndex > clientIndex) {
  throw new Error("Neutralino globals must load before the client library.");
}

console.log("Neutralino globals bootstrap is present.");
