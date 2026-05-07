// NEW: Authentication endpoints - register, login, me
import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "lms-secret-key";
const SALT_ROUNDS = 10;

// POST /api/auth/register
// Register a new student account
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    // Check if email already exists
    const [existing] = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.email, email));

    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [student] = await db
      .insert(studentsTable)
      .values({
        name,
        email,
        password: hashedPassword,
        phone: phone ?? null,
        status: "pending",
        paymentStatus: "pending",
      })
      .returning();

    const token = jwt.sign(
      { id: student!.id, email: student!.email, name: student!.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: student!.id,
        name: student!.name,
        email: student!.email,
        phone: student!.phone ?? null,
        status: student!.status,
        paymentStatus: student!.paymentStatus,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error registering student");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
// Login with email and password, returns JWT token
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.email, email));

    if (!student) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Support students without password (created by admin)
    let passwordValid = false;
    if (student.password) {
      passwordValid = await bcrypt.compare(password, student.password);
    }

    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: student.id, email: student.email, name: student.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone ?? null,
        status: student.status,
        paymentStatus: student.paymentStatus,
        courseId: student.courseId ?? null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error logging in");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
// Returns current user info based on JWT token
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const [student] = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        email: studentsTable.email,
        phone: studentsTable.phone,
        status: studentsTable.status,
        paymentStatus: studentsTable.paymentStatus,
        courseId: studentsTable.courseId,
        progress: studentsTable.progress,
      })
      .from(studentsTable)
      .where(eq(studentsTable.id, decoded.id));

    if (!student) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone ?? null,
      status: student.status,
      paymentStatus: student.paymentStatus,
      courseId: student.courseId ?? null,
      progress: Number(student.progress),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching current user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
