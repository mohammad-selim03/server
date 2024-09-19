const express = require("express");
const cors = require("cors");
const serverless = require('serverless-http');
const multer = require("multer");
const path = require("path");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = 8000; // This will not be used in serverless

app.use(express.json());
app.use(cors());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads"); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.get("/", (req, res) => {
  res.send("Server is running!");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.oy7jbnx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("AnimalDatabase");
    const animalCollection = database.collection("animals");
    const categoryCollection = database.collection("categories");

    console.log("Successfully connected to MongoDB!");

    app.get("/api/animals", async (req, res) => {
      try {
        const animals = await animalCollection.find({}).toArray();
        res.status(200).json(animals);
      } catch (error) {
        console.error("Error fetching animals:", error);
        res.status(500).json({ message: "Failed to fetch animals." });
      }
    });

    app.get("/api/categories", async (req, res) => {
      try {
        const categories = await categoryCollection.find({}).toArray();
        res.status(200).json(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Failed to fetch categories." });
      }
    });

    app.post("/api/animals", upload.single("image"), async (req, res) => {
      try {
        const { name } = req.body;
        const image = req.file;

        if (!name || !image) {
          return res
            .status(400)
            .json({ message: "Name and image are required." });
        }

        const newAnimal = {
          name: name,
          image: {
            path: `/uploads/${image.filename}`, 
            contentType: image.mimetype,
          },
          createdAt: new Date(),
        };

        const result = await animalCollection.insertOne(newAnimal);
        res
          .status(201)
          .json({
            message: "Animal added successfully",
            animalId: result.insertedId,
          });
      } catch (error) {
        console.error("Error adding animal:", error);
        res.status(500).json({ message: "Failed to add animal." });
      }
    });

    app.post("/api/categories", async (req, res) => {
      try {
        const { name } = req.body;

        if (!name) {
          return res
            .status(400)
            .json({ message: "Category name is required." });
        }

        const existingCategory = await categoryCollection.findOne({
          name: name,
        });
        if (existingCategory) {
          return res.status(400).json({ message: "Category already exists." });
        }

        const newCategory = {
          name: name,
          createdAt: new Date(),
        };

        const result = await categoryCollection.insertOne(newCategory);
        res
          .status(201)
          .json({
            message: "Category added successfully",
            categoryId: result.insertedId,
          });
      } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).json({ message: "Failed to add category." });
      }
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

module.exports.handler = serverless(app);
