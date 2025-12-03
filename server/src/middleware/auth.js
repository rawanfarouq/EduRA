import { verifyAccess } from "../utils/jwt.js";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = verifyAccess(token); // { sub, role, iat, exp }
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user || user.isActive === false)
      return res.status(401).json({ message: "Unauthorized" });

    req.user = user;
    next();
  } catch{
    return res.status(401).json({ message: "Unauthorized" });
  }
};


export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: 'Forbidden' });
    next();
  };
