const { Command } = require("commander");
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, options.cache);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage: storage });

let inventory = [];

app.get("/RegisterForm.html", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "RegisterForm.html"));
});

app.get("/SearchForm.html", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "SearchForm.html"));
});

app.post("/register", upload.single("photo"), (req, res) => {
  const { inventory_name, description } = req.body;

  if (!inventory_name) {
    return res.status(400).send("Bad Request: Inventory Name is required");
  }

  const newItem = {
    id: (inventory.length + 1).toString(),
    name: inventory_name,
    description: description || "",
    photo: req.file ? req.file.filename : null 
  };

  inventory.push(newItem);

  res.status(201).json(newItem);
});

app.get("/inventory", (req, res) => {
  const inventoryWithLinks = inventory.map(item => ({
    id: item.id,
    inventory_name: item.name,
    description: item.description,
    photo_url: item.photo ? `http://${options.host}:${options.port}/inventory/${item.id}/photo` : null
  }));

  res.status(200).json(inventoryWithLinks);
});

app.listen(parseInt(options.port), options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});