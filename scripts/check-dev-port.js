import { createConnection } from "node:net";

const host = "127.0.0.1";
const port = 5173;
const socket = createConnection({ host, port });

socket.setTimeout(500);

socket.once("connect", () => {
  socket.destroy();
  console.error(
    [
      `Cannot start Pinguin: port ${port} is already in use.`,
      "Close the existing Pinguin development instance or the process using",
      `port ${port}, then run npm start again.`,
    ].join(" ")
  );
  process.exitCode = 1;
});

socket.once("error", () => {
  process.exitCode = 0;
});

socket.once("timeout", () => {
  socket.destroy();
  process.exitCode = 0;
});
