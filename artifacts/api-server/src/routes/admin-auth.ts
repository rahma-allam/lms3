import { Router } from "express";
import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const SECRET = process.env["SESSION_SECRET"] ?? "admin-secret-key-change-in-production";

function signToken(payload: { id: number; email: string; role: string; tenantId: number }) {
  return jwt.sign(payload, SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string) {
  return jwt.verify(token, SECRET) as { id: number; email: string; role: string; tenantId: number };
}

router.post("/setup", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const existing = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.tenantId, tenantId))
      .limit(1);

    if (existing.length > 0) return res.status(403).json({ error: "Admin already exists" });

    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const hashed = await bcrypt.hash(password, 10);
    const [admin] = await db
      .insert(adminUsersTable)
      .values({ email, password: hashed, name: name ?? "Admin", tenantId })
      .returning();

    res.json({ message: "Admin created", admin: { id: admin!.id, email: admin!.email, name: admin!.name } });
  } catch (err) {
    req.log.error({ err }, "Error in admin setup");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const [admin] = await db
      .select()
      .from(adminUsersTable)
      .where(and(
        eq(adminUsersTable.email, email),
        eq(adminUsersTable.tenantId, tenantId)
      ));

    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ id: admin.id, email: admin.email, role: admin.role, tenantId });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  } catch (err) {
    req.log.error({ err }, "Error in admin login");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const token = auth.slice(7);
    const payload = verifyAdminToken(token);
    const [admin] = await db
      .select()
      .from(adminUsersTable)
      .where(and(
        eq(adminUsersTable.id, payload.id),
        eq(adminUsersTable.tenantId, payload.tenantId)
      ));
    if (!admin) return res.status(401).json({ error: "Admin not found" });
    res.json({ id: admin.id, email: admin.email, name: admin.name, role: admin.role });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;