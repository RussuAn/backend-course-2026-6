const { Command } = require("commander");
const express = require("express");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const multer = require("multer");
const http = require("http");

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
app.use(express.json());

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

  res.status(201).end();
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

app.get("/inventory/:id", (req, res) => {
  const { id } = req.params;
  const item = inventory.find(i => i.id === id);

  if (!item) {
    return res.status(404).send("Not found: Item with this ID does not exist");
  }

  const response = {
    id: item.id,
    inventory_name: item.name,
    description: item.description,
    photo_url: item.photo ? `http://${options.host}:${options.port}/inventory/${item.id}/photo` : null
  };

  res.status(200).json(response);
});

app.get("/inventory/:id/photo", async (req, res) => {
  const { id } = req.params;
  const item = inventory.find(i => i.id === id);

  if (!item || !item.photo) {
    return res.status(404).send("Not found: Photo or item does not exist");
  }

  const photoPath = path.resolve(options.cache, item.photo);

  try {
    await fsPromises.access(photoPath);
    
    res.setHeader("Content-Type", "image/jpeg");
    res.sendFile(photoPath, (err) => {
      if (err) {
        if (!res.headersSent) {
          res.status(404).send("File missing during transfer");
        }
      }
    });
  } catch (err) {
    res.status(404).send("Not found: File missing in cache");
  }
});

app.put("/inventory/:id", (req, res) => {
  const { id } = req.params;
  const { inventory_name, description } = req.body;

  const item = inventory.find(i => i.id === id);

  if (!item) {
    return res.status(404).send("Not found: Item with this ID does not exist");
  }

  if (inventory_name) {
    item.name = inventory_name;
  }
  if (description !== undefined) {
    item.description = description;
  }

  res.status(200).end();
});

app.put("/inventory/:id/photo", upload.single("photo"), (req, res) => {
  const { id } = req.params;
  const item = inventory.find(i => i.id === id);

  if (!item) {
    if (req.file) {
      const uploadedFilePath = path.resolve(options.cache, req.file.filename);
      if (fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
    }
    return res.status(404).send("Not found: Item does not exist");
  }

  if (req.file) {
    if (item.photo) {
      const oldPhotoPath = path.resolve(options.cache, item.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    item.photo = req.file.filename;
    res.status(200).end();
  } else {
    res.status(400).send("Bad Request: No photo uploaded");
  }
});

const server = http.createServer(app);
server.listen(parseInt(options.port), options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});