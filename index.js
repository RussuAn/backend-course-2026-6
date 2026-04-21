const { Command } = require("commander");
const http = require("http");
const fs = require("fs");

const program = new Command();

program.configureOutput({
  outputError: (str, write) => {
    if (str.includes("required option")) {
      write("Error: Please specify all required parameters (-h, -p, -c)\n");
      process.exit(1);
    } else {
      write(str);
    }
  }
});

program
  .requiredOption("-h, --host <host>", "адреса сервера")
  .requiredOption("-p, --port <port>", "порт сервера")
  .requiredOption("-c, --cache <path>", "шлях до директорії з кешованими файлами");

program.parse(process.argv);
const options = program.opts();

if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
}

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Inventory Service is running");
});

server.listen(parseInt(options.port), options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});