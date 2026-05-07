import { Router } from "express";
import { db } from "@workspace/db";
import { instructorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const SECRET = process.env["SESSION_SECRET"] ?? "instructor-secret-key";

export function verifyInstructorToken(token: string) {
  return jwt.verify(token, SECRET) as { id: number; email: string; name: string };
}

// POST /api/instructor-auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });

    const [instructor] = await db
      .select()
      .from(instructorsTable)
      .where(eq(instructorsTable.email, email));

    if (!instructor || !instructor.password)
      return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, instructor.password);
    if (!valid)
      return res.status(401).json({ error: "Invalid credentials" });

    if (!instructor.isActive)
      return res.status(403).json({ error: "Account is inactive" });

    const token = jwt.sign(
      { id: instructor.id, email: instructor.email, name: instructor.name },
      SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      instructor: {
        id: instructor.id,
        email: instructor.email,
        name: instructor.name,
        nameAr: instructor.nameAr,
        avatarUrl: instructor.avatarUrl,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error in instructor login");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/instructor-auth/me
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer "))
      return res.status(401).json({ error: "Unauthorized" });

    const token = auth.slice(7);
    const payload = verifyInstructorToken(token);

    const [instructor] = await db
      .select()
      .from(instructorsTable)
      .where(eq(instructorsTable.id, payload.id));

    if (!instructor)
      return res.status(401).json({ error: "Instructor not found" });

    res.json({
      id: instructor.id,
      email: instructor.email,
      name: instructor.name,
      nameAr: instructor.nameAr,
      avatarUrl: instructor.avatarUrl,
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;