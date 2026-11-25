const jwt = require("jsonwebtoken");
const { Admin } = require("./models");
async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Please sign in as an administrator." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub).select("_id email");
    if (!admin) return res.status(401).json({ message: "Admin account not found." });
    req.admin = admin; next();
  } catch {
    return res.status(401).json({ message: "Your session is invalid or expired. Please sign in again." });
  }
}
module.exports = { requireAdmin };
