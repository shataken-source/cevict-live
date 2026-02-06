import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, CheckCircle, PlayCircle, Award } from 'lucide-react';
import QuizModal from './QuizModal';

interface CoursePlayerProps {
  courseId: string;
  captainId: string;
  onBack: () => void;
}

export default function CoursePlayer({ courseId, captainId, onBack }: CoursePlayerProps) {
  const [course, setCourse] = useState<any>(null);
  const [currentModule, setCurrentModule] = useState(0);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    const { data } = await supabase.functions.invoke('training-academy', {
      body: { action: 'getCourse', courseId }
    });
    if (data?.course) setCourse(data.course);
  };

  const handleCompleteLesson = async (quizScore?: number) => {
    const lessonId = `${courseId}-m${currentModule}-l${currentLesson}`;
    
    await supabase.functions.invoke('training-academy', {
      body: { 
        action: 'completeLesson', 
        captainId, 
        lessonId,
        quizScore 
      }
    });

    // Award points for completing lesson (gamification)
    try {
      await supabase.functions.invoke('points-rewards-system', {
        body: {
          action: 'award_points',
          userId: captainId,
          actionType: 'lesson_complete',
          amount: 10,
        },
      });
    } catch (pointsError) {
      console.error('Error awarding lesson completion points:', pointsError);
      // Don't block lesson completion if points fail
    }

    setCompletedLessons(prev => new Set([...prev, lessonId]));
    setShowQuiz(false);

    // Move to next lesson
    if (currentLesson < course.modules[currentModule].lessons - 1) {
      setCurrentLesson(currentLesson + 1);
    } else if (currentModule < course.modules.length - 1) {
      setCurrentModule(currentModule + 1);
      setCurrentLesson(0);
    } else {
      // Course completed - award certification
      await supabase.functions.invoke('training-academy', {
        body: { action: 'awardCertification', captainId, courseId }
      });

      // Award points for completing course (gamification)
      try {
        await supabase.functions.invoke('points-rewards-system', {
          body: {
            action: 'award_points',
            userId: captainId,
            actionType: 'course_complete',
            amount: 100,
          },
        });

        // Award certification points
        await supabase.functions.invoke('points-rewards-system', {
          body: {
            action: 'award_points',
            userId: captainId,
            actionType: 'certification_earned',
            amount: 150,
          },
        });
      } catch (pointsError) {
        console.error('Error awarding course completion points:', pointsError);
        // Don't block course completion if points fail
      }

      alert('Congratulations! You have completed the course and earned your certification! +250 points');
      onBack();
    }
  };

  if (!course) return <div>Loading...</div>;

  const totalLessons = course.modules.reduce((sum: number, m: any) => sum + m.lessons, 0);
  const progressPercent = (completedLessons.size / totalLessons) * 100;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back to Courses
      </Button>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-gray-600">{course.description}</p>
          </div>
          <div className="text-4xl">{course.badge}</div>
        </div>
        
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span>Course Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="aspect-video bg-gray-900 rounded-lg mb-4 flex items-center justify-center">
              <PlayCircle className="w-16 h-16 text-white opacity-50" />
            </div>
            
            <h2 className="text-xl font-bold mb-2">
              Lesson {currentLesson + 1}: {course.modules[currentModule].title}
            </h2>
            <p className="text-gray-600 mb-4">
              This lesson covers essential concepts in {course.category.replace('_', ' ')}.
            </p>

            <div className="flex gap-3">
              <Button onClick={() => setShowQuiz(true)} className="flex-1">
                Complete Lesson & Take Quiz
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-4">
            <h3 className="font-bold mb-4">Course Modules</h3>
            {course.modules.map((module: any, idx: number) => (
              <div key={idx} className="mb-4">
                <div className="font-semibold mb-2">{module.title}</div>
                {Array.from({ length: module.lessons }).map((_, lessonIdx) => {
                  const lessonId = `${courseId}-m${idx}-l${lessonIdx}`;
                  const isCompleted = completedLessons.has(lessonId);
                  const isCurrent = idx === currentModule && lessonIdx === currentLesson;
                  
                  return (
                    <div 
                      key={lessonIdx}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        isCurrent ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2" />
                      )}
                      Lesson {lessonIdx + 1}
                    </div>
                  );
                })}
              </div>
            ))}
          </Card>
        </div>
      </div>

      {showQuiz && (
        <QuizModal 
          onClose={() => setShowQuiz(false)}
          onComplete={handleCompleteLesson}
          userId={captainId}
          lessonId={`${courseId}-m${currentModule}-l${currentLesson}`}
        />
      )}
    </div>
  );
}
