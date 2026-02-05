import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import CourseCard from './CourseCard';
import CoursePlayer from './CoursePlayer';
import { GraduationCap, Trophy, BookOpen, TrendingUp } from 'lucide-react';

export default function TrainingAcademyDashboard({ captainId }: { captainId: string }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>({});
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const { data } = await supabase.functions.invoke('training-academy', {
        body: { action: 'getCourses' }
      });
      
      if (data?.courses) {
        setCourses(data.courses);
        
        // Load progress for each course
        const progressData: any = {};
        for (const course of data.courses) {
          const { data: prog } = await supabase.functions.invoke('training-academy', {
            body: { action: 'getProgress', captainId, courseId: course.id }
          });
          if (prog?.progress) {
            progressData[course.id] = prog.progress;
          }
        }
        setProgress(progressData);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedCourses = Object.values(progress).filter((p: any) => p.percentage === 100).length;
  const totalLessons = courses.reduce((sum, c) => sum + c.modules.reduce((s: number, m: any) => s + m.lessons, 0), 0);
  const completedLessons = Object.values(progress).reduce((sum: any, p: any) => sum + (p.completed || 0), 0);

  if (selectedCourse) {
    return <CoursePlayer courseId={selectedCourse} captainId={captainId} onBack={() => setSelectedCourse(null)} />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gulf Coast Charters Training Academy</h1>
        <p className="text-gray-600">Enhance your skills and earn certifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{courses.length}</div>
              <div className="text-sm text-gray-600">Courses Available</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold">{completedCourses}</div>
              <div className="text-sm text-gray-600">Certifications Earned</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{completedLessons}/{totalLessons}</div>
              <div className="text-sm text-gray-600">Lessons Completed</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{Math.round((completedLessons / totalLessons) * 100)}%</div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="all" className="mb-8">
        <TabsList>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="customer_service">Customer Service</TabsTrigger>
          <TabsTrigger value="marine_biology">Marine Biology</TabsTrigger>
          <TabsTrigger value="business_management">Business</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                progress={progress[course.id]}
                onStart={setSelectedCourse}
              />
            ))}
          </div>
        </TabsContent>
        
        {['safety', 'customer_service', 'marine_biology', 'business_management'].map(category => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.filter(c => c.category === category).map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  progress={progress[course.id]}
                  onStart={setSelectedCourse}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
