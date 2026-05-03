require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'haj-secret-key-2025';

/* ═══════════════════════════════════════════
   CORS - ALLOW ALL (for debugging)
   ═══════════════════════════════════════════ */
app.use(cors({
  origin: true,  // allow any origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', cors());

app.use(express.json());
app.use(express.static('.'));

const DB_FILE = './database.json';

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = { users: {}, orders: {}, nextId: 1 };
      writeDB(initial);
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('DB read error:', e);
    return { users: {}, orders: {}, nextId: 1 };
  }
}

function writeDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB write error:', e);
  }
}

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

const authMiddleware = (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const db = readDB();
    const user = db.users[decoded.id];
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/* ═══════════════════════════════════════════
   AUTH ROUTES
   ═══════════════════════════════════════════ */
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be 6+ chars' });
    }

    const db = readDB();
    const existing = Object.values(db.users).find(u => u.email === email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userId = 'user_' + db.nextId++;
    const hashedPass = bcrypt.hashSync(password, 10);
    db.users[userId] = {
      id: userId, name, email, password: hashedPass,
      address: '', phone: '', orders: [], cart: [],
      role: 'user', createdAt: new Date().toISOString()
    };

    writeDB(db);

    res.status(201).json({
      success: true,
      token: generateToken(userId),
      user: { id: userId, name, email, address: '', phone: '' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all fields' });
    }

    const db = readDB();
    const user = Object.values(db.users).find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Wrong email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Wrong email or password' });
    }

    res.json({
      success: true,
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, address: user.address, phone: user.phone }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = req.user;
    const db = readDB();
    const orders = (user.orders || []).map(orderId => db.orders[orderId]).filter(Boolean);
    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, address: user.address, phone: user.phone, orders }
    });
  } catch (error) {
    console.error('/auth/me error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/auth/profile', authMiddleware, (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const db = readDB();
    const user = db.users[req.userId];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.name = name || user.name;
    user.address = address !== undefined ? address : user.address;
    user.phone = phone !== undefined ? phone : user.phone;
    writeDB(db);
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, address: user.address, phone: user.phone } });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══════════════════════════════════════════
   PRODUCTS
   ═══════════════════════════════════════════ */
const allProducts = [
  { id: '1', name: 'Chiffon hijab with attached inner cap', price: 120, images: ['jel8.jpg','jel3.jpg','jel4.jpg','jel5.jpg','jel6.jpg','jel7.jpg'], category: 'chiffon', isBestSeller: true },
  { id: '2', name: 'FLOWERS HIJAB', price: 180, images: ['m2.jpg','m3.jpg','m4.jpg','m5.jpg','m6.jpg','m7.jpg'], category: 'flowers', isBestSeller: true },
  { id: '3', name: 'STAN HIJAB', price: 299, images: ['stan2.jpg','stan3.jpg','stan4.jpg','stan5.jpg','stan6.jpg','stan7.jpg'], category: 'stan', isBestSeller: true },
  { id: '4', name: 'PASHAMIL HIJAB', price: 250, images: ['p7.jpg','p2.jpg','p8.jpg','p3.jpg','p4.jpg','p5.jpg'], category: 'pashamil' },
  { id: '5', name: 'MILT HIJAB', price: 150, images: ['c1.jpg','c2.jpg','c4.jpg','c3.jpg','c5.jpg','c6.jpg'], category: 'milt' },
  { id: '6', name: 'TIGER HIJAB', price: 200, images: ['d1.jpg','d2.jpg','d3.jpg','d5.jpg','d7.jpg'], category: 'tiger' }
];

app.get('/api/products', (req, res) => {
  const { category, search, bestseller } = req.query;
  let products = [...allProducts];
  if (category) products = products.filter(p => p.category === category);
  if (bestseller === 'true') products = products.filter(p => p.isBestSeller);
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  res.json({ success: true, count: products.length, products });
});

app.get('/api/products/bestsellers/list', (req, res) => {
  res.json({ success: true, products: allProducts.filter(p => p.isBestSeller).slice(0, 3) });
});

app.get('/api/products/:id', (req, res) => {
  const product = allProducts.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product });
});

/* ═══════════════════════════════════════════
   CART
   ═══════════════════════════════════════════ */
app.get('/api/cart', authMiddleware, (req, res) => {
  res.json({ success: true, cart: req.user.cart || [] });
});

app.post('/api/cart', authMiddleware, (req, res) => {
  const { productId, quantity, selectedImage } = req.body;
  const db = readDB();
  const user = db.users[req.userId];
  if (!user.cart) user.cart = [];
  const existing = user.cart.find(item => item.product === productId);
  if (existing) existing.quantity += quantity || 1;
  else user.cart.push({ product: productId, quantity: quantity || 1, selectedImage });
  writeDB(db);
  res.json({ success: true, cart: user.cart });
});

app.delete('/api/cart/:productId', authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users[req.userId];
  user.cart = (user.cart || []).filter(item => item.product !== req.params.productId);
  writeDB(db);
  res.json({ success: true, cart: user.cart });
});

app.delete('/api/cart', authMiddleware, (req, res) => {
  const db = readDB();
  db.users[req.userId].cart = [];
  writeDB(db);
  res.json({ success: true, cart: [] });
});

/* ═══════════════════════════════════════════
   ORDERS
   ═══════════════════════════════════════════ */
app.post('/api/orders', authMiddleware, (req, res) => {
  const { items, shippingInfo, paymentMethod } = req.body;
  if (!items || !items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const db = readDB();
  const orderId = 'order_' + db.nextId++;
  const orderNumber = 'HAJ-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  const order = {
    id: orderId, user: req.userId, items, totalAmount,
    shippingInfo, paymentMethod, paymentStatus: 'pending',
    orderStatus: 'pending', orderNumber, createdAt: new Date().toISOString()
  };

  db.orders[orderId] = order;
  const user = db.users[req.userId];
  if (!user.orders) user.orders = [];
  user.orders.push(orderId);
  user.cart = [];
  writeDB(db);

  res.status(201).json({ success: true, order });
});

app.get('/api/orders/my-orders', authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users[req.userId];
  const orders = (user.orders || []).map(id => db.orders[id]).filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, orders });
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const db = readDB();
  const order = db.orders[req.params.id];
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user !== req.userId) return res.status(403).json({ success: false, message: 'Not authorized' });
  res.json({ success: true, order });
});

/* ═══════════════════════════════════════════
   HEALTH CHECK
   ═══════════════════════════════════════════ */
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});


/* ═══════════════════════════════════════════
   ADMIN MIDDLEWARE & ROUTES
   ═══════════════════════════════════════════ */
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Get all orders (admin only)
app.get('/api/admin/orders', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const db = readDB();
    const allOrders = Object.values(db.orders).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: allOrders.length, orders: allOrders });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status (admin only)
app.put('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const db = readDB();
    const order = db.orders[req.params.id];
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.orderStatus = status;
    order.updatedAt = new Date().toISOString();
    writeDB(db);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const db = readDB();
    const users = Object.values(db.users).map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      address: u.address, phone: u.phone, createdAt: u.createdAt,
      ordersCount: (u.orders || []).length
    }));
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get admin dashboard stats
app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const db = readDB();
    const allOrders = Object.values(db.orders);
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = allOrders.length;
    const totalUsers = Object.keys(db.users).length;
    const pendingOrders = allOrders.filter(o => o.orderStatus === 'pending').length;

    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        totalUsers,
        pendingOrders,
        deliveredOrders: allOrders.filter(o => o.orderStatus === 'delivered').length
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create admin user endpoint (for initial setup)
app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;
    if (secretKey !== process.env.ADMIN_SECRET_KEY && secretKey !== 'haj-admin-setup-2025') {
      return res.status(403).json({ success: false, message: 'Invalid secret key' });
    }
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all fields' });
    }
    const db = readDB();
    const existing = Object.values(db.users).find(u => u.email === email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const userId = 'user_' + db.nextId++;
    const hashedPass = bcrypt.hashSync(password, 10);
    db.users[userId] = {
      id: userId, name, email, password: hashedPass,
      address: '', phone: '', orders: [], cart: [],
      role: 'admin', createdAt: new Date().toISOString()
    };
    writeDB(db);
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      token: generateToken(userId),
      user: { id: userId, name, email, role: 'admin' }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══════════════════════════════════════════
   ERROR HANDLER
   ═══════════════════════════════════════════ */
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Open: http://localhost:${PORT}`);
  console.log(`🔑 JWT_SECRET loaded: ${JWT_SECRET === 'haj-secret-key-2025' ? 'USING DEFAULT (change in production!)' : 'FROM ENV'}`);
});