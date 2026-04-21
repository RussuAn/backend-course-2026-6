const { Command } = require("commander");
const express = require("express");
const fs = require("fs");
const path = require("path");

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

const app = express();

app.get("/RegisterForm.html", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "RegisterForm.html"));
});

app.listen(parseInt(options.port), options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});