/**
 * GCC University Learning Hub System
 * 
 * Complete educational platform for fishing community
 * Courses, certifications, and skill development
 * 
 * Features:
 * - Fishing courses and certifications
 * - Video lessons and tutorials
 * - Skill assessments and quizzes
 * - Instructor-led workshops
 * - Progress tracking and badges
 * - Community discussions and Q&A
 * - Equipment guides and tutorials
 * - Safety and regulations training
 */

export interface Course {
  id: string;
  title: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'safety' | 'conservation' | 'techniques' | 'equipment' | 'business';
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  price: number;
  currency: string;
  instructor: {
    id: string;
    name: string;
    bio: string;
    avatar: string;
    certifications: string[];
    experience: string;
  };
  content: {
    lessons: Lesson[];
    resources: Resource[];
    assessments: Assessment[];
    certificate: {
      available: boolean;
      requirements: string[];
      template: string;
    };
  };
  enrollment: {
    maxStudents: number;
    currentStudents: number;
    isOpen: boolean;
    prerequisites: string[];
    startDate?: string;
    endDate?: string;
  };
  ratings: {
    average: number;
    count: number;
    distribution: Record<number, number>; // 1-5 stars
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    tags: string[];
    language: string;
    difficulty: number; // 1-10
  };
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'text' | 'interactive' | 'quiz' | 'workshop';
  content: {
    videoUrl?: string;
    videoDuration?: number;
    textContent?: string;
    interactiveElements?: {
      type: 'simulation' | 'drag_drop' | 'multiple_choice';
      data: any;
    }[];
    quizQuestions?: QuizQuestion[];
  };
  duration: number; // minutes
  order: number;
  isRequired: boolean;
  resources: Resource[];
  objectives: string[];
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'image' | 'link' | 'download' | 'checklist';
  url: string;
  description: string;
  fileSize?: number;
  duration?: number;
  isDownloadable: boolean;
  metadata: {
    uploadedAt: string;
    uploadedBy: string;
  };
}

export interface Assessment {
  id: string;
  title: string;
  type: 'quiz' | 'practical' | 'project' | 'peer_review';
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number; // minutes
  attempts: number;
  isRequired: boolean;
  metadata: {
    createdAt: string;
    updatedBy: string;
  };
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'practical';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points: number;
  metadata: {
    difficulty: number;
    category: string;
  };
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  progress: {
    completedLessons: string[];
    currentLesson?: string;
    completionPercentage: number;
    timeSpent: number; // minutes
    lastAccessed: string;
  };
  assessments: {
    assessmentId: string;
    score: number;
    passed: boolean;
    attempts: number;
    completedAt: string;
  }[];
  certificate?: {
    issued: boolean;
    issuedAt: string;
    certificateUrl: string;
    verificationCode: string;
  };
  payments: {
    amount: number;
    paidAt: string;
    paymentId: string;
    method: string;
  }[];
}

export interface StudentProgress {
  userId: string;
  overallStats: {
    coursesEnrolled: number;
    coursesCompleted: number;
    totalHours: number;
    averageScore: number;
    streakDays: number;
    lastActive: string;
  };
  skills: {
    skill: string;
    level: number; // 1-5
    endorsements: number;
    lastAssessed: string;
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    earnedAt: string;
    badgeUrl: string;
  }[];
  learningPath: {
    currentPath: string;
    recommendedCourses: string[];
    nextMilestone: string;
  };
}

export interface UniversityAnalytics {
  overview: {
    totalCourses: number;
    activeStudents: number;
    totalEnrollments: number;
    completionRate: number;
    averageRating: number;
  };
  engagement: {
    averageCourseDuration: number;
    studentRetention: number;
    interactionRate: number;
    certificationRate: number;
  };
  performance: {
    topCourses: {
      courseId: string;
      title: string;
      enrollments: number;
      completionRate: number;
      rating: number;
    }[];
    popularCategories: {
      category: string;
      courses: number;
      students: number;
    }[];
    revenueMetrics: {
      totalRevenue: number;
      averageCoursePrice: number;
      studentLifetimeValue: number;
    };
  };
}

export class GCCUniversity {
  private static instance: GCCUniversity;
  private courses: Map<string, Course> = new Map();
  private enrollments: Map<string, Enrollment[]> = new Map(); // userId -> enrollments
  private studentProgress: Map<string, StudentProgress> = new Map();
  private courseEnrollments: Map<string, Enrollment[]> = new Map(); // courseId -> enrollments

  // Configuration
  private readonly MAX_STUDENTS_PER_COURSE = 1000;
  private readonly CERTIFICATE_VALIDITY_DAYS = 365;
  private readonly PASSING_SCORE_DEFAULT = 80;

  public static getInstance(): GCCUniversity {
    if (!GCCUniversity.instance) {
      GCCUniversity.instance = new GCCUniversity();
    }
    return GCCUniversity.instance;
  }

  private constructor() {
    this.initializeSampleCourses();
    this.startProgressTracking();
  }

  /**
   * Create new course
   */
  public async createCourse(
    title: string,
    description: string,
    category: Course['category'],
    level: Course['level'],
    instructor: Course['instructor'],
    price: number,
    lessons: Lesson[],
    createdBy: string
  ): Promise<Course> {
    try {
      const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.duration, 0);

      const course: Course = {
        id: crypto.randomUUID(),
        title,
        description,
        category,
        level,
        duration: totalDuration,
        price,
        currency: 'usd',
        instructor,
        content: {
          lessons: lessons.sort((a, b) => a.order - b.order),
          resources: [],
          assessments: [],
          certificate: {
            available: true,
            requirements: ['Complete all lessons', 'Pass final assessment'],
            template: 'gcc_certificate_standard',
          },
        },
        enrollment: {
          maxStudents: this.MAX_STUDENTS_PER_COURSE,
          currentStudents: 0,
          isOpen: true,
          prerequisites: [],
        },
        ratings: {
          average: 0,
          count: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy,
          tags: this.generateCourseTags(category, level),
          language: 'en',
          difficulty: this.getDifficultyNumber(level),
        },
      };

      this.courses.set(course.id, course);
      this.courseEnrollments.set(course.id, []);

      return course;
    } catch (error) {
      throw new Error(`Failed to create course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enroll student in course
   */
  public async enrollStudent(
    courseId: string,
    userId: string,
    paymentId?: string
  ): Promise<Enrollment> {
    try {
      const course = this.courses.get(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.enrollment.isOpen) {
        throw new Error('Course is not open for enrollment');
      }

      if (course.enrollment.currentStudents >= course.enrollment.maxStudents) {
        throw new Error('Course is full');
      }

      // Check prerequisites
      const userEnrollments = this.enrollments.get(userId) || [];
      const hasPrerequisites = this.checkPrerequisites(course, userEnrollments);
      if (!hasPrerequisites) {
        throw new Error('Prerequisites not met');
      }

      // Check if already enrolled
      const existingEnrollment = userEnrollments.find(e => e.courseId === courseId);
      if (existingEnrollment) {
        throw new Error('Already enrolled in this course');
      }

      const enrollment: Enrollment = {
        id: crypto.randomUUID(),
        courseId,
        userId,
        enrolledAt: new Date().toISOString(),
        status: 'active',
        progress: {
          completedLessons: [],
          completionPercentage: 0,
          timeSpent: 0,
          lastAccessed: new Date().toISOString(),
        },
        assessments: [],
        payments: paymentId ? [{
          amount: course.price,
          paidAt: new Date().toISOString(),
          paymentId,
          method: 'stripe',
        }] : [],
      };

      // Add to enrollments
      userEnrollments.push(enrollment);
      this.enrollments.set(userId, userEnrollments);

      // Add to course enrollments
      const courseEnrollments = this.courseEnrollments.get(courseId) || [];
      courseEnrollments.push(enrollment);
      this.courseEnrollments.set(courseId, courseEnrollments);

      // Update course student count
      course.enrollment.currentStudents = courseEnrollments.length;
      this.courses.set(courseId, course);

      // Initialize or update student progress
      await this.updateStudentProgress(userId);

      return enrollment;
    } catch (error) {
      throw new Error(`Failed to enroll student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Complete lesson
   */
  public async completeLesson(
    courseId: string,
    lessonId: string,
    userId: string,
    timeSpent: number
  ): Promise<boolean> {
    try {
      const course = this.courses.get(courseId);
      if (!course) {
        return false;
      }

      const userEnrollments = this.enrollments.get(userId) || [];
      const enrollment = userEnrollments.find(e => e.courseId === courseId);
      
      if (!enrollment || enrollment.status !== 'active') {
        return false;
      }

      // Mark lesson as completed
      if (!enrollment.progress.completedLessons.includes(lessonId)) {
        enrollment.progress.completedLessons.push(lessonId);
        enrollment.progress.timeSpent += timeSpent;
        enrollment.progress.lastAccessed = new Date().toISOString();

        // Calculate completion percentage
        const totalLessons = course.content.lessons.filter(l => l.isRequired).length;
        const completedRequiredLessons = enrollment.progress.completedLessons.filter(lessonId => {
          const lesson = course.content.lessons.find(l => l.id === lessonId);
          return lesson?.isRequired;
        }).length;

        enrollment.progress.completionPercentage = Math.round((completedRequiredLessons / totalLessons) * 100);

        // Check if course is completed
        if (enrollment.progress.completionPercentage >= 100) {
          await this.completeCourse(courseId, userId);
        }

        // Update enrollments
        this.enrollments.set(userId, userEnrollments);
        
        // Update student progress
        await this.updateStudentProgress(userId);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Submit assessment
   */
  public async submitAssessment(
    courseId: string,
    assessmentId: string,
    userId: string,
    answers: Record<string, any>
  ): Promise<{
    score: number;
    passed: boolean;
    feedback: string;
  }> {
    try {
      const course = this.courses.get(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      const assessment = course.content.assessments.find(a => a.id === assessmentId);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Grade the assessment
      const { score, feedback } = this.gradeAssessment(assessment, answers);
      const passed = score >= assessment.passingScore;

      // Update enrollment
      const userEnrollments = this.enrollments.get(userId) || [];
      const enrollment = userEnrollments.find(e => e.courseId === courseId);
      
      if (enrollment) {
        // Remove previous attempts if any
        enrollment.assessments = enrollment.assessments.filter(a => a.assessmentId !== assessmentId);
        
        // Add new attempt
        enrollment.assessments.push({
          assessmentId,
          score,
          passed,
          attempts: 1,
          completedAt: new Date().toISOString(),
        });

        this.enrollments.set(userId, userEnrollments);

        // Check if all requirements met for certificate
        if (passed && this.meetsCertificateRequirements(course, enrollment)) {
          await this.issueCertificate(courseId, userId);
        }
      }

      return { score, passed, feedback };
    } catch (error) {
      throw new Error(`Failed to submit assessment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available courses
   */
  public async getAvailableCourses(
    category?: Course['category'],
    level?: Course['level'],
    priceRange?: { min: number; max: number }
  ): Promise<Course[]> {
    let courses = Array.from(this.courses.values());

    // Apply filters
    if (category) {
      courses = courses.filter(c => c.category === category);
    }

    if (level) {
      courses = courses.filter(c => c.level === level);
    }

    if (priceRange) {
      courses = courses.filter(c => 
        c.price >= priceRange.min && c.price <= priceRange.max
      );
    }

    // Sort by rating and enrollment
    return courses.sort((a, b) => {
      const ratingDiff = b.ratings.average - a.ratings.average;
      if (ratingDiff !== 0) return ratingDiff;
      return b.enrollment.currentStudents - a.enrollment.currentStudents;
    });
  }

  /**
   * Get student's enrollments
   */
  public async getStudentEnrollments(
    userId: string,
    status?: Enrollment['status']
  ): Promise<Enrollment[]> {
    const enrollments = this.enrollments.get(userId) || [];
    
    if (status) {
      return enrollments.filter(e => e.status === status);
    }

    return enrollments.sort((a, b) => 
      new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
    );
  }

  /**
   * Get student progress
   */
  public async getStudentProgress(userId: string): Promise<StudentProgress> {
    let progress = this.studentProgress.get(userId);
    
    if (!progress) {
      progress = await this.initializeStudentProgress(userId);
      this.studentProgress.set(userId, progress);
    }

    return progress;
  }

  /**
   * Rate course
   */
  public async rateCourse(
    courseId: string,
    userId: string,
    rating: number,
    review?: string
  ): Promise<boolean> {
    try {
      const course = this.courses.get(courseId);
      if (!course) {
        return false;
      }

      if (rating < 1 || rating > 5) {
        return false;
      }

      // Check if user is enrolled
      const userEnrollments = this.enrollments.get(userId) || [];
      const enrollment = userEnrollments.find(e => e.courseId === courseId);
      
      if (!enrollment) {
        return false;
      }

      // Update rating (mock implementation - would store individual ratings)
      const totalRatings = course.ratings.count + 1;
      const totalScore = course.ratings.average * course.ratings.count + rating;
      
      course.ratings.average = Math.round((totalScore / totalRatings) * 10) / 10;
      course.ratings.count = totalRatings;
      course.ratings.distribution[rating] = (course.ratings.distribution[rating] || 0) + 1;

      this.courses.set(courseId, course);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get university analytics
   */
  public async getUniversityAnalytics(): Promise<UniversityAnalytics> {
    const totalCourses = this.courses.size;
    let totalEnrollments = 0;
    let completedEnrollments = 0;
    let totalRating = 0;
    let ratingCount = 0;

    for (const course of this.courses.values()) {
      totalEnrollments += course.enrollment.currentStudents;
      totalRating += course.ratings.average * course.ratings.count;
      ratingCount += course.ratings.count;
    }

    for (const enrollments of this.enrollments.values()) {
      completedEnrollments += enrollments.filter(e => e.status === 'completed').length;
    }

    const activeStudents = this.enrollments.size;
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    // Calculate top courses
    const topCourses = Array.from(this.courses.values())
      .sort((a, b) => b.enrollment.currentStudents - a.enrollment.currentStudents)
      .slice(0, 5)
      .map(course => ({
        courseId: course.id,
        title: course.title,
        enrollments: course.enrollment.currentStudents,
        completionRate: 75, // Mock calculation
        rating: course.ratings.average,
      }));

    // Calculate popular categories
    const categoryStats: Record<string, { courses: number; students: number }> = {};
    for (const course of this.courses.values()) {
      if (!categoryStats[course.category]) {
        categoryStats[course.category] = { courses: 0, students: 0 };
      }
      categoryStats[course.category].courses++;
      categoryStats[course.category].students += course.enrollment.currentStudents;
    }

    const popularCategories = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      courses: stats.courses,
      students: stats.students,
    }));

    return {
      overview: {
        totalCourses,
        activeStudents,
        totalEnrollments,
        completionRate,
        averageRating,
      },
      engagement: {
        averageCourseDuration: 180, // minutes
        studentRetention: 85.5, // percentage
        interactionRate: 72.3, // percentage
        certificationRate: 68.9, // percentage
      },
      performance: {
        topCourses,
        popularCategories,
        revenueMetrics: {
          totalRevenue: totalEnrollments * 75, // Mock average price
          averageCoursePrice: 75,
          studentLifetimeValue: 225, // 3 courses average
        },
      },
    };
  }

  /**
   * Private helper methods
   */
  private generateCourseTags(category: Course['category'], level: Course['level']): string[] {
    const tags = [category, level];
    
    switch (category) {
      case 'beginner':
        tags.push('basics', 'foundation');
        break;
      case 'techniques':
        tags.push('skills', 'methods');
        break;
      case 'safety':
        tags.push('protection', 'guidelines');
        break;
      case 'conservation':
        tags.push('environment', 'sustainability');
        break;
      case 'equipment':
        tags.push('gear', 'tools');
        break;
      case 'business':
        tags.push('professional', 'commercial');
        break;
    }

    return tags;
  }

  private getDifficultyNumber(level: Course['level']): number {
    switch (level) {
      case 'beginner': return 2;
      case 'intermediate': return 5;
      case 'advanced': return 8;
      default: return 5;
    }
  }

  private checkPrerequisites(course: Course, userEnrollments: Enrollment[]): boolean {
    if (course.enrollment.prerequisites.length === 0) {
      return true;
    }

    const completedCourses = userEnrollments
      .filter(e => e.status === 'completed')
      .map(e => e.courseId);

    return course.enrollment.prerequisites.every(prereq => 
      completedCourses.includes(prereq)
    );
  }

  private async completeCourse(courseId: string, userId: string): Promise<void> {
    const userEnrollments = this.enrollments.get(userId) || [];
    const enrollment = userEnrollments.find(e => e.courseId === courseId);
    
    if (enrollment) {
      enrollment.status = 'completed';
      this.enrollments.set(userId, userEnrollments);
      
      // Update student progress
      await this.updateStudentProgress(userId);
    }
  }

  private gradeAssessment(
    assessment: Assessment,
    answers: Record<string, any>
  ): { score: number; feedback: string } {
    let correctAnswers = 0;
    let totalPoints = 0;

    for (const question of assessment.questions) {
      totalPoints += question.points;
      
      const userAnswer = answers[question.id];
      if (userAnswer === question.correctAnswer) {
        correctAnswers += question.points;
      }
    }

    const score = Math.round((correctAnswers / totalPoints) * 100);
    
    let feedback = `You scored ${score}% on this assessment.`;
    if (score >= assessment.passingScore) {
      feedback += ' Congratulations, you passed!';
    } else {
      feedback += ' Review the material and try again.';
    }

    return { score, feedback };
  }

  private meetsCertificateRequirements(course: Course, enrollment: Enrollment): boolean {
    if (!course.content.certificate.available) {
      return false;
    }

    const allLessonsCompleted = enrollment.progress.completionPercentage >= 100;
    const assessmentsPassed = course.content.assessments.every(assessment => {
      const result = enrollment.assessments.find(a => a.assessmentId === assessment.id);
      return result && result.passed;
    });

    return allLessonsCompleted && assessmentsPassed;
  }

  private async issueCertificate(courseId: string, userId: string): Promise<void> {
    const userEnrollments = this.enrollments.get(userId) || [];
    const enrollment = userEnrollments.find(e => e.courseId === courseId);
    
    if (enrollment) {
      const verificationCode = this.generateVerificationCode();
      
      enrollment.certificate = {
        issued: true,
        issuedAt: new Date().toISOString(),
        certificateUrl: `https://gcc.university/certificates/${enrollment.id}`,
        verificationCode,
      };

      this.enrollments.set(userId, userEnrollments);
    }
  }

  private generateVerificationCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'GCC-';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private async initializeStudentProgress(userId: string): Promise<StudentProgress> {
    const userEnrollments = this.enrollments.get(userId) || [];
    const completedCourses = userEnrollments.filter(e => e.status === 'completed');
    const totalHours = userEnrollments.reduce((sum, e) => sum + (e.progress.timeSpent / 60), 0);
    const averageScore = completedCourses.length > 0
      ? completedCourses.reduce((sum, e) => {
          const assessmentScores = e.assessments.map(a => a.score);
          return sum + (assessmentScores.length > 0 ? assessmentScores.reduce((s, a) => s + a, 0) / assessmentScores.length : 0);
        }, 0) / completedCourses.length
      : 0;

    return {
      userId,
      overallStats: {
        coursesEnrolled: userEnrollments.length,
        coursesCompleted: completedCourses.length,
        totalHours,
        averageScore,
        streakDays: 0,
        lastActive: new Date().toISOString(),
      },
      skills: [],
      achievements: [],
      learningPath: {
        currentPath: 'general_fishing',
        recommendedCourses: [],
        nextMilestone: 'complete_beginner_course',
      },
    };
  }

  private async updateStudentProgress(userId: string): Promise<void> {
    const progress = await this.initializeStudentProgress(userId);
    this.studentProgress.set(userId, progress);
  }

  private initializeSampleCourses(): void {
    const sampleInstructor = {
      id: 'instructor1',
      name: 'Captain John Smith',
      bio: '20+ years experience in Gulf Coast fishing',
      avatar: '/instructors/john-smith.jpg',
      certifications: ['USCG Captain', 'Fishing Guide License'],
      experience: '20 years commercial and recreational fishing',
    };

    const sampleLessons: Lesson[] = [
      {
        id: 'lesson1',
        title: 'Introduction to Gulf Coast Fishing',
        description: 'Learn the basics of fishing in the Gulf Coast',
        type: 'video',
        content: {
          videoUrl: '/videos/intro-gulf-fishing.mp4',
          videoDuration: 600,
        },
        duration: 10,
        order: 1,
        isRequired: true,
        resources: [],
        objectives: ['Understand Gulf Coast ecosystem', 'Learn basic fishing techniques'],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ];

    const sampleCourse: Course = {
      id: 'sample-course-1',
      title: 'Gulf Coast Fishing Basics',
      description: 'Complete beginner course for Gulf Coast fishing',
      category: 'beginner',
      level: 'beginner',
      duration: 120,
      price: 49,
      currency: 'usd',
      instructor: sampleInstructor,
      content: {
        lessons: sampleLessons,
        resources: [],
        assessments: [],
        certificate: {
          available: true,
          requirements: ['Complete all lessons'],
          template: 'gcc_certificate_basic',
        },
      },
      enrollment: {
        maxStudents: 100,
        currentStudents: 0,
        isOpen: true,
        prerequisites: [],
      },
      ratings: {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin',
        tags: ['beginner', 'basics', 'gulf-coast'],
        language: 'en',
        difficulty: 2,
      },
    };

    this.courses.set(sampleCourse.id, sampleCourse);
    this.courseEnrollments.set(sampleCourse.id, []);
  }

  private startProgressTracking(): void {
    // Update student progress daily
    setInterval(() => {
      this.updateAllStudentProgress();
    }, 24 * 60 * 60 * 1000);
  }

  private updateAllStudentProgress(): void {
    for (const userId of this.enrollments.keys()) {
      this.updateStudentProgress(userId);
    }
  }

  /**
   * Get course by ID
   */
  public async getCourseById(courseId: string): Promise<Course | null> {
    return this.courses.get(courseId) || null;
  }

  /**
   * Get course enrollments
   */
  public async getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
    return this.courseEnrollments.get(courseId) || [];
  }

  /**
   * Search courses
   */
  public async searchCourses(
    query: string,
    filters: {
      category?: Course['category'];
      level?: Course['level'];
      priceRange?: { min: number; max: number };
    } = {}
  ): Promise<Course[]> {
    const courses = await this.getAvailableCourses(filters.category, filters.level, filters.priceRange);
    
    return courses.filter(course => 
      course.title.toLowerCase().includes(query.toLowerCase()) ||
      course.description.toLowerCase().includes(query.toLowerCase()) ||
      course.metadata.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }
}

export default GCCUniversity;
