import jwt from "jsonwebtoken";

const BEARER_PREFIX = "Bearer ";

// Verifies `Authorization: Bearer <token>` and sets req.user = { id, userType }.
export function requireAuth(req, res, next) {
  const header = req.get("Authorization");
  if (typeof header !== "string" || !header.startsWith(BEARER_PREFIX)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(header.slice(BEARER_PREFIX.length), process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || !["owner", "sitter"].includes(payload.userType)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = { id: payload.sub, userType: payload.userType };
    return next();
  } catch {
    // Expired, malformed or wrongly signed token.
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Use after requireAuth: requireRole("owner") or requireRole("owner", "sitter").
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
