const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'classic_register_secret_dev_only';

function authenticateToken(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ success: false, message: 'No token provided.' });

  jwt.verify(token, SECRET, (err, payload) => {
    if (err)
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    req.user = payload;
    next();
  });
}

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

module.exports = { authenticateToken, generateToken };