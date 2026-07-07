import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_COST = 10;
const JWT_TTL = "7d";
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function authError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role
  };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function createAuthService({ db, jwtSecret, publicBaseUrl = "" }) {
  if (!db) throw new Error("db is required");

  function requireJwtSecret() {
    if (!jwtSecret) throw authError(500, "jwt_secret_missing", "JWT secret is not configured");
  }

  function signUser(user) {
    requireJwtSecret();
    return jwt.sign({ sub: String(user.id), username: user.username, role: user.role }, jwtSecret, { expiresIn: JWT_TTL });
  }

  return {
    async bootstrapInitialAdmin({ username = "admin", password } = {}) {
      if (!username || !password) return { created: false, reason: "missing_credentials" };
      if (db.getUserByUsername(username)) return { created: false, reason: "user_exists" };
      const user = db.createUser({ username, passwordHash: await hashPassword(password), role: "admin" });
      return { created: true, user: sanitizeUser(user) };
    },
    async createInvite({ createdByUserId = null, role = "member" } = {}) {
      const inviteToken = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
      db.createInvite({ tokenHash: sha256(inviteToken), role, expiresAt, createdByUserId });
      const inviteUrl = publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, "")}/register?invite=${encodeURIComponent(inviteToken)}` : "";
      return { inviteToken, inviteUrl, expiresAt };
    },
    async registerWithInvite({ inviteToken, username, password }) {
      if (!inviteToken) throw authError(400, "invite_required", "Invite token is required");
      if (!username || !password) throw authError(400, "invalid_credentials", "Username and password are required");
      const consumed = db.consumeInvite({ tokenHash: sha256(inviteToken) });
      if (!consumed.ok && consumed.reason === "expired") throw authError(410, "invite_expired", "Invite token expired");
      if (!consumed.ok) throw authError(410, "invite_invalid", "Invite token is invalid or already used");
      const passwordHash = await hashPassword(password);
      const user = db.createUser({ username, passwordHash, role: consumed.invite.role });
      return { token: signUser(user), user: sanitizeUser(user) };
    },
    async login({ username, password }) {
      if (!username || !password) throw authError(400, "invalid_credentials", "Username and password are required");
      const user = db.getUserByUsername(username);
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        throw authError(401, "invalid_credentials", "Username or password is incorrect");
      }
      return { token: signUser(user), user: sanitizeUser(user) };
    },
    verifyToken(token) {
      requireJwtSecret();
      return jwt.verify(token, jwtSecret);
    },
    sanitizeUser
  };
}
