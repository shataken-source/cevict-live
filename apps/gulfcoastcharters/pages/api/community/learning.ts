/**
 * GCC University / Learning Hub API
 * GET  /api/community/learning                                  — list all courses
 *   ?category=...                                                — filter by category
 *   ?level=beginner|intermediate|advanced                        — filter by level
 * GET  /api/community/learning?courseId=...                      — single course detail
 * GET  /api/community/learning?action=myProgress                 — user's enrolled courses + progress
 * POST /api/community/learning { action: 'enroll', courseId }    — enroll in a course
 * POST /api/community/learning { action: 'updateProgress', courseId, completionPercentage, quizScores }
 * POST /api/community/learning { action: 'complete', courseId }  — mark course complete
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const POINTS_FOR_ENROLL = 5;
const POINTS_FOR_COMPLETE = 100;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getSupabaseAdmin();

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const courseId = String(req.query.courseId || '').trim();
      const action = String(req.query.action || '').toLowerCase();

      // ── Single course detail ──
      if (courseId) {
        const { data: course, error } = await admin
          .from('learning_courses')
          .select('*')
          .eq('course_id', courseId)
          .single();

        if (error || !course) return res.status(404).json({ error: 'Course not found' });

        // Get instructor info if present
        let instructor = null;
        if (course.instructor_id) {
          const { data: cap } = await admin
            .from('captains')
            .select('id, user_id')
            .eq('id', course.instructor_id)
            .maybeSingle();

          if (cap) {
            const { data: u } = await admin
              .from('shared_users')
              .select('display_name, avatar_url')
              .eq('id', cap.user_id)
              .maybeSingle();
            instructor = {
              captainId: cap.id,
              displayName: u?.display_name || 'Captain',
              avatarUrl: u?.avatar_url || null,
            };
          }
        }

        // Get enrollment count
        const { count: enrollmentCount } = await admin
          .from('course_progress')
          .select('progress_id', { count: 'exact', head: true })
          .eq('course_id', courseId);

        // Get completion count
        const { count: completionCount } = await admin
          .from('course_progress')
          .select('progress_id', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('completed', true);

        // Check user's progress if authenticated
        let userProgress = null;
        let learningUser: any = null;
        try { const result = await getAuthedUser(req, res); learningUser = result.user; } catch { /* not logged in */ }
        if (learningUser) {
          const { data: progress } = await admin
            .from('course_progress')
            .select('*')
            .eq('course_id', courseId)
            .eq('user_id', learningUser.id)
            .maybeSingle();
          userProgress = progress;
        }

        return res.status(200).json({
          success: true,
          course: {
            ...course,
            instructor,
            enrollmentCount: enrollmentCount || 0,
            completionCount: completionCount || 0,
            userProgress,
          },
        });
      }

      // ── User's enrolled courses + progress ──
      if (action === 'myprogress') {
        const { user, error: authError } = await getAuthedUser(req, res);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

        const { data: progress } = await admin
          .from('course_progress')
          .select('progress_id, course_id, completed, completion_percentage, quiz_scores, completed_at, started_at, updated_at, learning_courses(course_id, title, description, category, course_level, certificate_badge_id)')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        const inProgress = (progress || []).filter(p => !p.completed);
        const completed = (progress || []).filter(p => p.completed);

        return res.status(200).json({
          success: true,
          inProgress,
          completed,
          stats: {
            totalEnrolled: (progress || []).length,
            totalCompleted: completed.length,
            averageProgress: (progress || []).length > 0
              ? Math.round((progress || []).reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / (progress || []).length)
              : 0,
          },
        });
      }

      // ── List courses ──
      const category = String(req.query.category || '').trim();
      const level = String(req.query.level || '').trim().toLowerCase();

      let query = admin
        .from('learning_courses')
        .select('course_id, title, description, category, course_level, price, free_for_pro, certificate_badge_id, created_at')
        .order('created_at', { ascending: false });

      if (category) query = query.eq('category', category);
      if (level && ['beginner', 'intermediate', 'advanced'].includes(level)) {
        query = query.eq('course_level', level);
      }

      const { data: courses, error: coursesError } = await query;
      if (coursesError) return res.status(500).json({ error: coursesError.message });

      // Get enrollment counts for each course
      const courseIds = (courses || []).map(c => c.course_id);
      const enrollmentCounts = new Map<string, number>();
      if (courseIds.length > 0) {
        for (const cid of courseIds) {
          const { count } = await admin
            .from('course_progress')
            .select('progress_id', { count: 'exact', head: true })
            .eq('course_id', cid);
          enrollmentCounts.set(cid, count || 0);
        }
      }

      // Get unique categories for filter
      const categories = [...new Set((courses || []).map(c => c.category))].filter(Boolean);

      const enrichedCourses = (courses || []).map(c => ({
        ...c,
        enrollmentCount: enrollmentCounts.get(c.course_id) || 0,
      }));

      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      return res.status(200).json({
        success: true,
        courses: enrichedCourses,
        categories,
        totalCourses: enrichedCourses.length,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Enroll in course ──
      if (action === 'enroll') {
        const { courseId } = body;
        if (!courseId) return res.status(400).json({ error: 'courseId required' });

        // Verify course exists
        const { data: course } = await admin
          .from('learning_courses')
          .select('course_id, title, price')
          .eq('course_id', courseId)
          .single();
        if (!course) return res.status(404).json({ error: 'Course not found' });

        // Check if already enrolled
        const { data: existing } = await admin
          .from('course_progress')
          .select('progress_id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) return res.status(200).json({ success: true, alreadyEnrolled: true });

        const { data: enrollment, error: enrollError } = await admin
          .from('course_progress')
          .insert({
            course_id: courseId,
            user_id: user.id,
            completion_percentage: 0,
          })
          .select()
          .single();

        if (enrollError) return res.status(500).json({ error: enrollError.message });

        // Award enrollment points
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_ENROLL }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_ENROLL, type: 'earned',
            description: `Enrolled in: ${course.title}`,
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          enrollment,
          pointsEarned: POINTS_FOR_ENROLL,
          message: `Enrolled in "${course.title}"!`,
        });
      }

      // ── Update progress ──
      if (action === 'updateProgress') {
        const { courseId, completionPercentage, quizScores } = body;
        if (!courseId) return res.status(400).json({ error: 'courseId required' });

        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (completionPercentage !== undefined) {
          updates.completion_percentage = Math.max(0, Math.min(100, Number(completionPercentage)));
        }
        if (quizScores !== undefined) {
          updates.quiz_scores = quizScores;
        }

        const { error } = await admin
          .from('course_progress')
          .update(updates)
          .eq('course_id', courseId)
          .eq('user_id', user.id);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Progress updated' });
      }

      // ── Complete course ──
      if (action === 'complete') {
        const { courseId } = body;
        if (!courseId) return res.status(400).json({ error: 'courseId required' });

        // Verify enrollment
        const { data: progress } = await admin
          .from('course_progress')
          .select('progress_id, completed')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!progress) return res.status(404).json({ error: 'Not enrolled in this course' });
        if (progress.completed) return res.status(200).json({ success: true, alreadyCompleted: true });

        // Mark complete
        await admin
          .from('course_progress')
          .update({
            completed: true,
            completion_percentage: 100,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('progress_id', progress.progress_id);

        // Award completion points
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_COMPLETE }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_COMPLETE, type: 'earned',
            description: 'Course completed',
          });
        } catch { /* best-effort */ }

        // Get course title for response
        const { data: course } = await admin
          .from('learning_courses')
          .select('title, certificate_badge_id')
          .eq('course_id', courseId)
          .maybeSingle();

        return res.status(200).json({
          success: true,
          pointsEarned: POINTS_FOR_COMPLETE,
          certificateBadge: course?.certificate_badge_id || null,
          message: `Congratulations! You completed "${course?.title || 'the course'}"! +${POINTS_FOR_COMPLETE} points.`,
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use: enroll, updateProgress, complete' });
    } catch (e: any) {
      console.error('[Learning] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
