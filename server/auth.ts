import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Fixed machine API key for n8n bot integration
// This key is embedded in the n8n workflow and must match the DB
const N8N_MACHINE_KEY = "3477e2bd6616a95eb2dcbb3a9e39b663fddab5a90fe7d71cdd45a7b34040fca4";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const PostgresStore = connectPg(session);

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    console.warn("SESSION_SECRET is not set. Generating a random secret for this session.");
  }

  app.use(
    session({
      secret: sessionSecret || randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      name: "employee_mgmt_session", // Use custom name for session cookie
      rolling: true, // Reset cookie expiration on every response
      cookie: {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        maxAge: 10 * 60 * 1000, // 10 minutes session timeout
      },
      store: new PostgresStore({
        pool,
        createTableIfMissing: true,
      }),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // On startup: reset any stuck isOnline flags left from a previous crash/restart
  (async () => {
    try {
      await storage.resetAllOnlineStatus();
      console.log("Reset all user online statuses on startup");
    } catch (err) {
      console.error("Error resetting online statuses:", err);
    }
  })();

  // Create default admin user on startup
  (async () => {
    try {
      const admin = await storage.getUserByUsername("admin");
      if (!admin) {
        const hashedPassword = await hashPassword("123456");
        await storage.createUser({
          username: "admin",
          password: hashedPassword,
          role: "admin",
        });
        console.log("Default admin created: admin / 123456");
      }
    } catch (err) {
      console.error("Error creating default admin:", err);
    }
  })();

  // Ensure n8n machine API key exists on startup (same key embedded in workflow)
  (async () => {
    try {
      const existing = await storage.getApiKeyByValue(N8N_MACHINE_KEY);
      if (!existing) {
        await storage.createApiKey(
          { description: "n8n", keyType: "machine", isActive: true },
          N8N_MACHINE_KEY
        );
        console.log("n8n machine API key seeded successfully.");
      }
    } catch (err) {
      console.error("Error seeding n8n API key:", err);
    }
  })();

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: any, done) => {
    try {
      const user = await storage.getUser(String(id));
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}