const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '접근 토큰이 필요합니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: '비활성화된 계정입니다.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

const requireLogin = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  requireLogin,
  optionalAuth
};