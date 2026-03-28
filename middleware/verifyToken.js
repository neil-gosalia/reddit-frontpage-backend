const jwt = require("jsonwebtoken")

function verifyToken(req, res, next){
    const authHeader = req.headers.authorization
    const token = auhtHeader?.split(" ")[1];
}

if(!token){
    return res.status(401).json({error: "Login Required"});
}

try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
} catch(err){
    res.status(401).json({error: "Invalid or Expired token"});
}

module.exports = verifyToken;