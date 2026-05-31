require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: [
  'http://localhost:5173',
  'https://aafiyasheerin.github.io'
],
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString().slice(11,19)} ${req.method.padEnd(6)} ${req.path}`);
  next();
});
// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Classic Register API is running!' });
});
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/employees',  require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leaves',     require('./routes/leaves'));
app.use('/api/overtime',   require('./routes/overtime'));
app.use('/api/salary',     require('./routes/salary'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', app: 'Classic Register ERP', ts: new Date().toISOString() })
);

app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

app.use((err, _req, res, _next) => {
  console.error('Unhandled:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n🪡  Classic Register ERP  →  http://localhost:${PORT}/api\n`);
});

module.exports = app;