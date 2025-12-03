// utils/jwt.js
import jwt from "jsonwebtoken";

function required(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    // Fail fast with a helpful error instead of "secretOrPrivateKey must have a value"
    throw new Error(
      `[JWT CONFIG] Missing ${name}. Add it to your server .env (e.g., ${name}=...)`
    );
  }
  return v;
}

const ACCESS_SECRET  = () => required("JWT_ACCESS_SECRET");
const REFRESH_SECRET = () => required("JWT_REFRESH_SECRET");

export function signAccess(payload, opts = {}) {
  return jwt.sign(payload, ACCESS_SECRET(), { expiresIn: "15m", ...opts });
}

export function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET());
}

export function signRefresh(payload, opts = {}) {
  return jwt.sign(payload, REFRESH_SECRET(), { expiresIn: "7d", ...opts });
}

export function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET());
}
