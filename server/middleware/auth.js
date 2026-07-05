const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {

  // Step 1: Read the Authorization header
  const authHeader = req.headers['authorization'];
  // looks like: "Bearer eyJhbGciOiJIUzI1NiJ9..."

  // Step 2: Check if header exists
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.' 
    });
  }

  // Step 3: Extract token (remove "Bearer " from the start)
  const token = authHeader.split(' ')[1];

  // Step 4: Check if token exists after splitting
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. Invalid token format.' 
    });
  }

  // Step 5: Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { userId: "6a4628fe...", iat: ..., exp: ... }

    // Step 6: Attach decoded data to req.user
    req.user = decoded;

    // Step 7: Pass to next middleware or route handler
    next();

  } catch (error) {
    return res.status(401).json({ 
      error: 'Access denied. Invalid or expired token.' 
    });
  }
};

module.exports = verifyToken;