import bcrypt from "bcrypt";
import UsersDAO, { DuplicateEmailError } from "../dao/usersDAO.js";

const USER_TYPES = ["owner", "sitter"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_COST = 10;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Returns an error message, or null if the body is valid.
function validateRegistration({ name, email, password, userType, location, bio }) {
  if (!isNonEmptyString(name)) return "Name is required";
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return "A valid email is required";
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!USER_TYPES.includes(userType)) return "userType must be owner or sitter";
  if (!isNonEmptyString(location)) return "Location is required";
  if (bio !== undefined && typeof bio !== "string") return "Bio must be text";
  return null;
}

export default class UsersController {
  static async apiRegister(req, res) {
    const body = req.body ?? {};
    const validationError = validateRegistration(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST);
      const user = await UsersDAO.addUser({
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        passwordHash,
        userType: body.userType,
        location: body.location.trim(),
        bio: (body.bio ?? "").trim(),
      });
      return res.status(201).json({ user });
    } catch (e) {
      if (e instanceof DuplicateEmailError) {
        return res.status(409).json({ error: "Email already registered" });
      }
      console.error(`apiRegister failed: ${e}`);
      return res.status(500).json({ error: "Registration failed" });
    }
  }
}
