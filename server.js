const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error('Set SESSION_SECRET to a random string of at least 32 characters before starting.');
  process.exit(1);
}

const db = new Database(process.env.DB_FILE || 'color-king.sqlite');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    demo_coins INTEGER NOT NULL DEFAULT 1250,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  name: 'ck.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const getPublicUser = user => ({ id: user.id, username: user.username, email: user.email, demoCoins: user.demo_coins });

app.get('/api/health', (req, res) => res.json({ ok: true, mode: 'demo-only' }));

app.post('/api/register', authLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–20 letters, numbers, or underscores.' });
  }
  if (!emailPattern.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 10 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be 10–72 characters long.' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username, email, hash);
    const user = db.prepare('SELECT id, username, email, demo_coins FROM users WHERE id = ?').get(result.lastInsertRowid);
    req.session.userId = user.id;
    res.status(201).json({ user: getPublicUser(user) });
  } catch (e) {
    if (String(e.code).startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'Username or email is already registered.' });
    }
    console.error(e);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const login = String(req.body.login || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE lower(username) = ? OR email = ?').get(login, login);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect username/email or password.' });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Could not start session.' });
    req.session.userId = user.id;
    res.json({ user: getPublicUser(user) });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  const user = db.prepare('SELECT id, username, email, demo_coins FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in.' });
  res.json({ user: getPublicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('ck.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({ ok: true });
  });
});

// Demo-only wallet: no deposits, withdrawals, cash value, or real-money prizes.
app.get('/api/demo-wallet', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in.' });
  const user = db.prepare('SELECT demo_coins FROM users WHERE id = ?').get(req.session.userId);
  res.json({ demoCoins: user.demo_coins, cashValue: 0 });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Color King demo running on http://localhost:${PORT}`));
