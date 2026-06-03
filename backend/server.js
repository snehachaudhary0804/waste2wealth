const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const MONGO_URI = process.env.MONGO_URI;

const useMongo = Boolean(MONGO_URI);
let UserModel = null;
const memoryUsers = [];

if (useMongo) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
  }, { timestamps: true });

  UserModel = mongoose.model('User', userSchema);
} else {
  console.warn('MONGO_URI not set. Falling back to temporary in-memory auth storage.');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function generateToken(user) {
  return jwt.sign({ id: user.id || user._id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function findUserByEmail(email) {
  if (useMongo) {
    return UserModel.findOne({ email }).lean();
  }

  return memoryUsers.find(user => user.email === email);
}

async function createUser(userData) {
  if (useMongo) {
    return UserModel.create(userData);
  }

  const newUser = { ...userData, id: `${Date.now()}` };
  memoryUsers.push(newUser);
  return newUser;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.get('/', (req, res) => {
  res.send('Waste2Wealth API Running');
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  try {
    const existingUser = await findUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const savedUser = await createUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
    });

    const token = generateToken(savedUser);
    return res.json({ token, user: { name: savedUser.name, email: savedUser.email, role: savedUser.role } });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Unable to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    return res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Unable to log in' });
  }
});

app.post('/api/upload', authMiddleware, upload.single('wasteImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.json({ imageUrl, filename: req.file.filename });
});

app.post('/api/chat', authMiddleware, async (req, res) => {
  const { message, imageUrl } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key is not configured on the server' });
  }

  const promptParts = [
    'You are an expert sustainable design assistant.',
    'A user is asking for ideas on how to transform waste into useful products.',
    `User name: ${req.user?.name || 'Unknown'}`,
    imageUrl ? `Attached image: ${imageUrl}` : 'No image was attached.',
    `User request: ${message}`,
    'Provide a helpful, creative list of product ideas and practical next steps based on the waste described.',
  ];

  const prompt = promptParts.join('\n');

  try {
    const completion = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
      max_output_tokens: 600,
    });

    const reply = completion.output_text || completion.output?.map(item => {
      if (!item.content) return '';
      return item.content.map(part => part.text || '').join('');
    }).join(' ');

    return res.json({ reply: reply?.trim() || 'No response available.' });
  } catch (error) {
    console.error('OpenAI chat error:', error);
    return res.status(500).json({ error: 'Failed to get a response from OpenAI' });
  }
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});