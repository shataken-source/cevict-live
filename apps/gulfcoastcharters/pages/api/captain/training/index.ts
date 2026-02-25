/**
 * Captain Training Academy API
 * GET  /api/captain/training                         — list all courses with captain's progress
 * GET  /api/captain/training?courseSlug=safety-101    — single course with modules/lessons/quizzes
 * POST /api/captain/training  { action: 'completeLesson', lessonId, quizScore }
 * POST /api/captain/training  { action: 'awardCert', courseSlug }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getAuthedUser, getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();

  // Verify captain
  const { data: captainProfile } = await admin
    .from('captain_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!captainProfile) return res.status(403).json({ error: 'User is not a captain' });

  const captainId = user.id;

  // ── GET: list courses or single course detail ──
  if (req.method === 'GET') {
    try {
      const courseSlug = String(req.query.courseSlug || '').trim();

      if (courseSlug) {
        // Single course with full detail
        const { data: course, error: courseErr } = await admin
          .from('training_courses')
          .select('*')
          .eq('slug', courseSlug)
          .eq('is_active', true)
          .single();

        if (courseErr || !course) return res.status(404).json({ error: 'Course not found' });

        // Get modules with lessons
        const { data: modules } = await admin
          .from('training_modules')
          .select('id, title, description, display_order')
          .eq('course_id', course.id)
          .order('display_order');

        const moduleIds = (modules || []).map(m => m.id);

        // Get lessons for all modules
        let lessons: any[] = [];
        if (moduleIds.length > 0) {
          const { data: lessonData } = await admin
            .from('training_lessons')
            .select('id, module_id, title, content_type, video_url, text_content, duration_minutes, display_order')
            .in('module_id', moduleIds)
            .order('display_order');
          lessons = lessonData || [];
        }

        // Get quiz questions for all lessons
        const lessonIds = lessons.map(l => l.id);
        let quizzes: any[] = [];
        if (lessonIds.length > 0) {
          const { data: quizData } = await admin
            .from('training_quiz_questions')
            .select('id, lesson_id, question, options, correct_index, explanation, display_order')
            .in('lesson_id', lessonIds)
            .order('display_order');
          quizzes = quizData || [];
        }

        // Get captain's progress for these lessons
        let progress: any[] = [];
        if (lessonIds.length > 0) {
          const { data: progressData } = await admin
            .from('training_progress')
            .select('lesson_id, completed, quiz_score, quiz_passed, attempts, completed_at')
            .eq('captain_id', captainId)
            .in('lesson_id', lessonIds);
          progress = progressData || [];
        }

        // Check for existing certification
        const { data: cert } = await admin
          .from('training_certifications')
          .select('id, certificate_number, awarded_at')
          .eq('captain_id', captainId)
          .eq('course_id', course.id)
          .maybeSingle();

        // Build response with nested structure
        const progressMap = new Map(progress.map(p => [p.lesson_id, p]));
        const quizMap = new Map<string, any[]>();
        for (const q of quizzes) {
          if (!quizMap.has(q.lesson_id)) quizMap.set(q.lesson_id, []);
          quizMap.get(q.lesson_id)!.push(q);
        }

        const modulesWithLessons = (modules || []).map(mod => ({
          ...mod,
          lessons: lessons
            .filter(l => l.module_id === mod.id)
            .map(l => ({
              ...l,
              progress: progressMap.get(l.id) || null,
              quiz: quizMap.get(l.id) || [],
            })),
        }));

        const totalLessons = lessons.length;
        const completedLessons = progress.filter(p => p.completed).length;

        return res.status(200).json({
          success: true,
          course: {
            ...course,
            modules: modulesWithLessons,
            totalLessons,
            completedLessons,
            progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
            certification: cert || null,
          },
        });
      }

      // List all courses with progress summary
      const { data: courses, error: coursesErr } = await admin
        .from('training_courses')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (coursesErr) return res.status(500).json({ error: coursesErr.message });

      // Get all captain's progress
      const { data: allProgress } = await admin
        .from('training_progress')
        .select('lesson_id, completed')
        .eq('captain_id', captainId);

      // Get all certifications
      const { data: allCerts } = await admin
        .from('training_certifications')
        .select('course_id, certificate_number, awarded_at')
        .eq('captain_id', captainId);

      const certMap = new Map((allCerts || []).map(c => [c.course_id, c]));
      const completedSet = new Set((allProgress || []).filter(p => p.completed).map(p => p.lesson_id));

      // Batch: get ALL modules and lessons in 2 queries instead of N*2
      const courseIds = (courses || []).map((c: any) => c.id);
      const { data: allModules } = await admin
        .from('training_modules')
        .select('id, course_id')
        .in('course_id', courseIds);

      const moduleIds = (allModules || []).map(m => m.id);
      let allLessonsForCourses: any[] = [];
      if (moduleIds.length > 0) {
        const { data } = await admin
          .from('training_lessons')
          .select('id, module_id')
          .in('module_id', moduleIds);
        allLessonsForCourses = data || [];
      }

      // Build course_id -> lesson_ids map via modules
      const moduleToCoursMap = new Map((allModules || []).map(m => [m.id, m.course_id]));
      const courseLessonsMap = new Map<string, string[]>();
      for (const lesson of allLessonsForCourses) {
        const courseId = moduleToCoursMap.get(lesson.module_id);
        if (courseId) {
          if (!courseLessonsMap.has(courseId)) courseLessonsMap.set(courseId, []);
          courseLessonsMap.get(courseId)!.push(lesson.id);
        }
      }

      const coursesWithProgress = (courses || []).map((course: any) => {
        const lessonIds = courseLessonsMap.get(course.id) || [];
        const totalLessons = lessonIds.length;
        const completedCount = lessonIds.filter(id => completedSet.has(id)).length;

        return {
          ...course,
          totalLessons,
          completedLessons: completedCount,
          progressPercent: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
          certification: certMap.get(course.id) || null,
        };
      });

      return res.status(200).json({
        success: true,
        courses: coursesWithProgress,
        stats: {
          totalCourses: coursesWithProgress.length,
          completedCourses: coursesWithProgress.filter((c: any) => c.certification).length,
          overallProgress: coursesWithProgress.length > 0
            ? Math.round(coursesWithProgress.reduce((sum: number, c: any) => sum + c.progressPercent, 0) / coursesWithProgress.length)
            : 0,
        },
      });
    } catch (e: any) {
      console.error('[Training] GET error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST: complete lesson or award cert ──
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Complete a lesson (submit quiz score) ──
      if (action === 'completeLesson') {
        const { lessonId, quizScore } = body;
        if (!lessonId) return res.status(400).json({ error: 'lessonId required' });
        if (quizScore == null || typeof quizScore !== 'number') {
          return res.status(400).json({ error: 'quizScore required (0-100)' });
        }

        const passed = quizScore >= 70;
        const now = new Date().toISOString();

        // Verify lesson exists
        const { data: lesson } = await admin
          .from('training_lessons')
          .select('id')
          .eq('id', lessonId)
          .single();
        if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

        // Upsert progress
        const { data: existing } = await admin
          .from('training_progress')
          .select('id, attempts, quiz_score')
          .eq('captain_id', captainId)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (existing) {
          const bestScore = Math.max(existing.quiz_score || 0, quizScore);
          await admin
            .from('training_progress')
            .update({
              quiz_score: bestScore,
              quiz_passed: bestScore >= 70,
              completed: bestScore >= 70,
              attempts: (existing.attempts || 0) + 1,
              completed_at: bestScore >= 70 ? now : null,
              updated_at: now,
            })
            .eq('id', existing.id);
        } else {
          await admin
            .from('training_progress')
            .insert({
              captain_id: captainId,
              lesson_id: lessonId,
              quiz_score: quizScore,
              quiz_passed: passed,
              completed: passed,
              attempts: 1,
              completed_at: passed ? now : null,
            });
        }

        return res.status(200).json({
          success: true,
          passed,
          quizScore,
          message: passed ? 'Lesson completed! Great job.' : 'Score below 70%. Please review and try again.',
        });
      }

      // ── Award certification ──
      if (action === 'awardCert') {
        const { courseSlug } = body;
        if (!courseSlug) return res.status(400).json({ error: 'courseSlug required' });

        const { data: course } = await admin
          .from('training_courses')
          .select('id, title')
          .eq('slug', courseSlug)
          .single();
        if (!course) return res.status(404).json({ error: 'Course not found' });

        // Verify all lessons are completed
        const { data: modules } = await admin
          .from('training_modules')
          .select('id')
          .eq('course_id', course.id);
        const moduleIds = (modules || []).map(m => m.id);

        let allLessons: any[] = [];
        if (moduleIds.length > 0) {
          const { data } = await admin
            .from('training_lessons')
            .select('id')
            .in('module_id', moduleIds);
          allLessons = data || [];
        }

        const { data: completed } = await admin
          .from('training_progress')
          .select('lesson_id')
          .eq('captain_id', captainId)
          .eq('completed', true)
          .in('lesson_id', allLessons.map(l => l.id));

        const completedSet = new Set((completed || []).map(c => c.lesson_id));
        const allComplete = allLessons.every(l => completedSet.has(l.id));

        if (!allComplete) {
          return res.status(400).json({
            error: 'Not all lessons completed',
            completed: completedSet.size,
            total: allLessons.length,
          });
        }

        // Check if already certified
        const { data: existingCert } = await admin
          .from('training_certifications')
          .select('id, certificate_number')
          .eq('captain_id', captainId)
          .eq('course_id', course.id)
          .maybeSingle();

        if (existingCert) {
          return res.status(200).json({
            success: true,
            alreadyCertified: true,
            certification: existingCert,
          });
        }

        // Generate certificate
        const certNumber = `GCC-${courseSlug.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        const { data: cert, error: certError } = await admin
          .from('training_certifications')
          .insert({
            captain_id: captainId,
            course_id: course.id,
            certificate_number: certNumber,
          })
          .select()
          .single();

        if (certError) return res.status(500).json({ error: certError.message });

        return res.status(201).json({
          success: true,
          certification: cert,
          message: `Congratulations! You've earned your ${course.title} certification.`,
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use: completeLesson, awardCert' });
    } catch (e: any) {
      console.error('[Training] POST error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
