// Feature 5B: Quizzes with Auto-Grading
import { Router } from "express";
import { db } from "@workspace/db";
import {
  quizzesTable, quizQuestionsTable, quizAttemptsTable,
  lessonCompletionsTable, lessonsTable, modulesTable, studentsTable,
} from "@workspace/db";
import { eq, sql, and, desc } from "drizzle-orm";

const router = Router();

// GET /api/quizzes/lesson/:lessonId — get quiz for a lesson (without correctIndex)
router.get("/lesson/:lessonId", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId!);
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.lessonId, lessonId));
    if (!quiz) return res.status(404).json({ error: "No quiz for this lesson" });

    const questions = await db
      .select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quizId, quiz.id))
      .orderBy(quizQuestionsTable.order);

    res.json({
      id: quiz.id,
      lessonId: quiz.lessonId,
      title: quiz.title,
      passingScore: quiz.passingScore,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: JSON.parse(q.options) as string[],
        order: q.order,
        // correctIndex is intentionally excluded for students
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching quiz");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quizzes/lesson/:lessonId — create quiz for a lesson
router.post("/lesson/:lessonId", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId!);
    const { title, passingScore, questions } = req.body;

    // Check if quiz already exists
    const [existing] = await db.select().from(quizzesTable).where(eq(quizzesTable.lessonId, lessonId));
    if (existing) return res.status(409).json({ error: "Quiz already exists for this lesson" });

    const [quiz] = await db
      .insert(quizzesTable)
      .values({ lessonId, title, passingScore: passingScore ?? 70 })
      .returning();

    if (questions?.length > 0) {
      await db.insert(quizQuestionsTable).values(
        questions.map((q: any) => ({
          quizId: quiz!.id,
          questionText: q.questionText,
          options: JSON.stringify(q.options),
          correctIndex: q.correctIndex,
          order: q.order ?? 0,
        }))
      );
    }

    const insertedQuestions = await db
      .select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quizId, quiz!.id))
      .orderBy(quizQuestionsTable.order);

    res.status(201).json({
      id: quiz!.id,
      lessonId: quiz!.lessonId,
      title: quiz!.title,
      passingScore: quiz!.passingScore,
      questions: insertedQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: JSON.parse(q.options) as string[],
        order: q.order,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating quiz");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/quizzes/:quizId — update quiz title/passingScore
router.put("/:quizId", async (req, res) => {
  try {
    const quizId = parseInt(req.params.quizId!);
    const { title, passingScore } = req.body;
    const update: Record<string, any> = {};
    if (title !== undefined) update.title = title;
    if (passingScore !== undefined) update.passingScore = passingScore;

    const [quiz] = await db.update(quizzesTable).set(update).where(eq(quizzesTable.id, quizId)).returning();
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    res.json(quiz);
  } catch (err) {
    req.log.error({ err }, "Error updating quiz");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/quizzes/:quizId
router.delete("/:quizId", async (req, res) => {
  try {
    const quizId = parseInt(req.params.quizId!);
    await db.delete(quizzesTable).where(eq(quizzesTable.id, quizId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting quiz");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quizzes/:quizId/questions — add a question
router.post("/:quizId/questions", async (req, res) => {
  try {
    const quizId = parseInt(req.params.quizId!);
    const { questionText, options, correctIndex, order } = req.body;
    const [q] = await db
      .insert(quizQuestionsTable)
      .values({ quizId, questionText, options: JSON.stringify(options), correctIndex, order: order ?? 0 })
      .returning();
    res.status(201).json({
      id: q!.id,
      questionText: q!.questionText,
      options: JSON.parse(q!.options) as string[],
      order: q!.order,
    });
  } catch (err) {
    req.log.error({ err }, "Error adding question");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/quizzes/questions/:questionId
router.delete("/questions/:questionId", async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId!);
    await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.id, questionId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting question");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quizzes/:quizId/submit — student submits answers
router.post("/:quizId/submit", async (req, res) => {
  try {
    const quizId = parseInt(req.params.quizId!);
    const { studentId, answers } = req.body;

    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId));
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const questions = await db
      .select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quizId, quizId))
      .orderBy(quizQuestionsTable.order);

    if (questions.length === 0) return res.status(400).json({ error: "Quiz has no questions" });

    // Auto-grade
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correctCount++;
    });
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passingScore;

    await db.insert(quizAttemptsTable).values({
      quizId,
      studentId,
      answers: JSON.stringify(answers),
      score,
      passed,
    });

    // If passed, mark lesson as complete and update progress
    if (passed) {
      await db.execute(
        sql`INSERT INTO lesson_completions (student_id, lesson_id) VALUES (${studentId}, ${quiz.lessonId}) ON CONFLICT DO NOTHING`
      );

      // Recalculate progress
      const [moduleRow] = await db
        .select({ courseId: modulesTable.courseId })
        .from(modulesTable)
        .innerJoin(lessonsTable, eq(lessonsTable.moduleId, modulesTable.id))
        .where(eq(lessonsTable.id, quiz.lessonId));

      if (moduleRow) {
        const [{ total }] = await db
          .select({ total: sql<number>`count(*)::int` })
          .from(lessonsTable)
          .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
          .where(eq(modulesTable.courseId, moduleRow.courseId));

        const [{ completed }] = await db
          .select({ completed: sql<number>`count(*)::int` })
          .from(lessonCompletionsTable)
          .innerJoin(lessonsTable, eq(lessonCompletionsTable.lessonId, lessonsTable.id))
          .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
          .where(
            sql`${lessonCompletionsTable.studentId} = ${studentId} AND ${modulesTable.courseId} = ${moduleRow.courseId}`
          );

        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        await db.update(studentsTable).set({ progress: progress.toString() }).where(eq(studentsTable.id, studentId));
      }
    }

    res.json({
      score,
      passed,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      passingScore: quiz.passingScore,
    });
  } catch (err) {
    req.log.error({ err }, "Error submitting quiz");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/quizzes/:quizId/attempts/:studentId — get latest attempt
router.get("/:quizId/attempts/:studentId", async (req, res) => {
  try {
    const quizId = parseInt(req.params.quizId!);
    const studentId = parseInt(req.params.studentId!);

    const [attempt] = await db
      .select()
      .from(quizAttemptsTable)
      .where(and(eq(quizAttemptsTable.quizId, quizId), eq(quizAttemptsTable.studentId, studentId)))
      .orderBy(desc(quizAttemptsTable.submittedAt))
      .limit(1);

    if (!attempt) return res.status(404).json({ error: "No attempt found" });

    res.json({
      id: attempt.id,
      quizId: attempt.quizId,
      studentId: attempt.studentId,
      score: attempt.score,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching quiz attempt");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
