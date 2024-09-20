const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

let client;
let cachedDb = null;

const connectToMongoDB = async () => {
  if (cachedDb) {
    return cachedDb;
  }
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log('Successfully connected to MongoDB');
  }
  cachedDb = client.db('AnimalDatabase');
  return cachedDb;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API routes
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// mongodb connection check on vercel...
app.get('/test-db-connection', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    if (db) {
      res.status(200).json({ message: 'MongoDB connection successful!' });
    } else {
      res.status(500).json({ message: 'Failed to connect to MongoDB.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'MongoDB connection error.', error: error.message });
  }
});

app.get('/animals', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const animalCollection = db.collection('animals');
    const animals = await animalCollection.find({}).toArray();
    res.status(200).json(animals);
  } catch (error) {
    console.error('Error fetching animals:', error);
    res.status(500).json({ message: 'Failed to fetch animals.' });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const categoryCollection = db.collection('categories');
    const categories = await categoryCollection.find({}).toArray();
    console.log("categories", categories)
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories.' });
  }
});

app.post('/animals', upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    const image = req.file;

    if (!name || !image) {
      return res.status(400).json({ message: 'Name and image are required.' });
    }

    const newAnimal = {
      name: name,
      image: {
        path: `/uploads/${image.filename}`,
        contentType: image.mimetype,
      },
      createdAt: new Date(),
    };

    const db = await connectToMongoDB();
    const animalCollection = db.collection('animals');
    const result = await animalCollection.insertOne(newAnimal);
    res.status(201).json({
      message: 'Animal added successfully',
      animalId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding animal:', error);
    res.status(500).json({ message: 'Failed to add animal.' });
  }
});

app.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const db = await connectToMongoDB();
    const categoryCollection = db.collection('categories');
    const existingCategory = await categoryCollection.findOne({ name });

    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists.' });
    }

    const newCategory = {
      name: name,
      createdAt: new Date(),
    };

    const result = await categoryCollection.insertOne(newCategory);
    res.status(201).json({
      message: 'Category added successfully',
      categoryId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Failed to add category.' });
  }
});

// Start the server locally (for local development)
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
