const jwt = require('jsonwebtoken');

// Middleware to protect routes and authorize based on roles
const protect = (roles = []) => {
  return (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        // Get token from header
        token = req.headers.authorization.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user to the request object
        req.user = decoded;

        // Check for role-based authorization
        if (roles.length && !roles.includes(req.user.role)) {
          return res.status(403).json({ message: 'Forbidden: You do not have the required permissions.' });
        }

        next();
      } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Not authorized, token failed' });
      }
    }

    if (!token) {
      res.status(401).json({ message: 'Not authorized, no token' });
    }
  };
};

module.exports = { protect };
