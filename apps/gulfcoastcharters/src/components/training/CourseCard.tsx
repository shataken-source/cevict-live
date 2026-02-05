import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, BookOpen, Award } from 'lucide-react';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    duration: number;
    badge: string;
    color: string;
    modules: Array<{ id: string; title: string; lessons: number }>;
  };
  progress?: { completed: number; total: number; percentage: number };
  onStart: (courseId: string) => void;
}

export default function CourseCard({ course, progress, onStart }: CourseCardProps) {
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons, 0);
  const isStarted = progress && progress.completed > 0;
  const isCompleted = progress && progress.percentage === 100;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-32" style={{ backgroundColor: course.color }}>
        <div className="flex items-center justify-center h-full text-6xl">
          {course.badge}
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg">{course.title}</h3>
          <Badge variant={course.difficulty === 'beginner' ? 'default' : 'secondary'}>
            {course.difficulty}
          </Badge>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">{course.description}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {course.duration} min
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {totalLessons} lessons
          </div>
        </div>

        {progress && isStarted && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} />
          </div>
        )}

        <Button 
          onClick={() => onStart(course.id)} 
          className="w-full"
          variant={isCompleted ? 'outline' : 'default'}
        >
          {isCompleted ? (
            <>
              <Award className="w-4 h-4 mr-2" />
              View Certificate
            </>
          ) : isStarted ? (
            'Continue Learning'
          ) : (
            'Start Course'
          )}
        </Button>
      </div>
    </Card>
  );
}
