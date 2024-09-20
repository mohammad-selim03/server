const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB client setup with caching
let cachedClient = null;

const connectToMongoDB = async () => {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await cachedClient.connect();
  console.log('Connected to MongoDB');
  return cachedClient.db('AnimalDatabase');
};

// API routes
app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.get('/animals', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const animals = await db.collection('animals').find({}).toArray();
    res.status(200).json(animals);
  } catch (error) {
    console.error('Error fetching animals:', error);
    res.status(500).json({ message: 'Failed to fetch animals.' });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const categories = await db.collection('categories').find({}).toArray();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories.' });
  }
});

app.post('/animals', async (req, res) => {
  try {
    const { name, image } = req.body;

    if (!name || !image) {
      return res.status(400).json({ message: 'Name and image are required.' });
    }

    const newAnimal = {
      name: name,
      image: {
        path: image.path, // Cloud-based path would be preferred
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

module.exports.handler = serverless(app);
