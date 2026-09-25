/**
 * Premium Market Hub — сервер (Node.js + Express)
 *
 * Даёт то, что не может статичный HTML-файл:
 *  - регистрация и вход покупателей
 *  - история заказов, привязанная к аккаунту
 *
 * Хранилище — простой JSON-файл (db.json), создаётся сам при первом запуске.
 * Ничего дополнительно устанавливать (вроде настоящей базы данных) не нужно.
 *
 * Запуск:
 *   npm install
 *   npm start
 * Затем откройте в браузере: http://localhost:3000
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 3000;

// ==== простое файловое хранилище ====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    return { users: [], orders: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('Не удалось прочитать db.json, начинаю с пустой базы:', e.message);
    return { users: [], orders: [] };
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

let db = loadDB();

function findUserByUsername(username) {
  return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
}
function findUserByToken(token) {
  const user = db.users.find(u => u.tokens.includes(token));
  return user || null;
}

// ==== middleware ====
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Требуется вход' });
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Сессия недействительна, войдите заново' });
  req.user = user;
  next();
}

// ==== регистрация ====
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите имя пользователя и пароль' });
  }
  if (String(username).trim().length < 3) {
    return res.status(400).json({ error: 'Имя пользователя — минимум 3 символа' });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: 'Пароль — минимум 4 символа' });
  }
  if (findUserByUsername(username)) {
    return res.status(409).json({ error: 'Такое имя пользователя уже занято' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(24).toString('hex');
  const user = {
    id: crypto.randomUUID(),
    username: String(username).trim(),
    passwordHash,
    tokens: [token],
    createdAt: Date.now(),
  };
  db.users.push(user);
  saveDB(db);

  res.json({ token, username: user.username });
});

// ==== вход ====
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите имя пользователя и пароль' });
  }
  const user = findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  user.tokens.push(token);
  saveDB(db);

  res.json({ token, username: user.username });
});

// ==== выход (аннулирует токен) ====
app.post('/api/logout', requireAuth, (req, res) => {
  req.user.tokens = req.user.tokens.filter(tok => tok !== (req.headers.authorization || '').slice(7));
  saveDB(db);
  res.json({ ok: true });
});

// ==== история заказов текущего пользователя ====
app.get('/api/orders', requireAuth, (req, res) => {
  const myOrders = db.orders
    .filter(o => o.userId === req.user.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json({ orders: myOrders });
});

// ==== сохранить новый заказ (вызывается при оформлении корзины) ====
app.post('/api/orders', requireAuth, (req, res) => {
  const { items, total } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Пустой заказ' });
  }
  const order = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    items,
    total: Number(total) || items.reduce((s, i) => s + (Number(i.price) || 0), 0),
    createdAt: Date.now(),
  };
  db.orders.push(order);
  saveDB(db);
  res.json({ order });
});

app.listen(PORT, () => {
  console.log(`Premium Market Hub запущен: http://localhost:${PORT}`);
});
