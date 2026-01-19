# Captain Training Academy System Guide

## Overview
The Captain Training Academy provides comprehensive online training for charter captains with video courses, quizzes, progress tracking, and digital certifications.

## Features

### 1. Course Categories
- **Safety**: Maritime safety protocols, emergency procedures, weather safety
- **Customer Service**: Guest communication, conflict resolution, memorable experiences
- **Marine Biology**: Fish species identification, conservation, ecosystem health
- **Business Management**: Marketing, financial management, growth strategies

### 2. Course Structure
Each course contains:
- Multiple modules organized by topic
- Video lessons with educational content
- Interactive quizzes to test knowledge
- Progress tracking per lesson and course
- Digital badges and certifications upon completion

### 3. Progress Tracking
- Real-time progress percentage for each course
- Lesson completion tracking
- Quiz scores recorded
- Overall academy progress statistics
- Visual progress bars and completion indicators

### 4. Certifications & Badges
- Digital certificates awarded upon course completion
- Visual badge system with unique icons and colors per course
- Certificates integrate with existing captain certification system
- Badges displayed on captain profiles

## Available Courses

### Maritime Safety Fundamentals (safety-101)
- **Duration**: 180 minutes
- **Badge**: 🛟 (Red)
- **Difficulty**: Beginner
- **Modules**:
  1. Emergency Procedures (5 lessons)
  2. Weather Safety (4 lessons)
  3. First Aid at Sea (6 lessons)

### Excellence in Customer Service (service-101)
- **Duration**: 120 minutes
- **Badge**: ⭐ (Blue)
- **Difficulty**: Beginner
- **Modules**:
  1. Guest Communication (4 lessons)
  2. Conflict Resolution (3 lessons)
  3. Creating Memorable Trips (5 lessons)

### Marine Biology Essentials (marine-bio-101)
- **Duration**: 240 minutes
- **Badge**: 🐠 (Green)
- **Difficulty**: Intermediate
- **Modules**:
  1. Fish Species Identification (8 lessons)
  2. Marine Conservation (5 lessons)
  3. Ecosystem Health (4 lessons)

### Charter Business Management (business-101)
- **Duration**: 200 minutes
- **Badge**: 💼 (Purple)
- **Difficulty**: Intermediate
- **Modules**:
  1. Marketing Your Charters (6 lessons)
  2. Financial Management (5 lessons)
  3. Growth Strategies (4 lessons)

## Usage

### For Captains

#### Accessing the Training Academy
1. Navigate to Captain Dashboard
2. Click on the "Training" tab
3. View all available courses and your progress

#### Taking a Course
1. Browse course catalog by category or view all courses
2. Click "Start Course" on any course card
3. Watch video lessons in sequence
4. Complete quizzes after each lesson (70% passing score required)
5. Progress automatically to next lesson upon quiz completion
6. Earn certification upon completing all course modules

#### Tracking Progress
- Dashboard shows overall academy statistics
- Individual course cards display progress percentage
- Course player shows module and lesson completion status
- Green checkmarks indicate completed lessons

### Quiz System
- 3 multiple-choice questions per lesson
- Must score 70% or higher to pass
- Immediate feedback on quiz completion
- Option to retry if score is below passing threshold
- Quiz scores recorded for progress tracking

## Integration with Certification System

Training certifications appear alongside official licenses:
- Displayed on captain profile pages
- Shown in CertificationBadges component
- Included in captain verification dashboard
- Visible to customers viewing captain credentials

## Edge Function API

### Endpoint: `training-academy`

#### Get All Courses
```javascript
{
  action: 'getCourses'
}
// Returns: { courses: [...] }
```

#### Get Single Course
```javascript
{
  action: 'getCourse',
  courseId: 'safety-101'
}
// Returns: { course: {...} }
```

#### Complete Lesson
```javascript
{
  action: 'completeLesson',
  captainId: 'captain-uuid',
  lessonId: 'safety-101-m0-l0',
  quizScore: 100
}
// Returns: { success: true, progress: {...} }
```

#### Get Progress
```javascript
{
  action: 'getProgress',
  captainId: 'captain-uuid',
  courseId: 'safety-101'
}
// Returns: { progress: { completed: 8, total: 15, percentage: 53 } }
```

#### Award Certification
```javascript
{
  action: 'awardCertification',
  captainId: 'captain-uuid',
  courseId: 'safety-101'
}
// Returns: { success: true, certification: {...} }
```

## Components

### TrainingAcademyDashboard
Main academy interface with:
- Course catalog with category filtering
- Progress statistics cards
- Course grid with visual cards
- Tab navigation by category

### CourseCard
Individual course display showing:
- Course badge and color theme
- Title, description, difficulty level
- Duration and lesson count
- Progress bar (if started)
- Action button (Start/Continue/View Certificate)

### CoursePlayer
Course viewing interface with:
- Video player area
- Lesson navigation sidebar
- Progress tracking
- Quiz integration
- Module and lesson organization

### QuizModal
Interactive quiz interface with:
- Multiple choice questions
- Radio button selection
- Progress through questions
- Score calculation and display
- Pass/fail feedback
- Retry option for failed attempts

## Future Enhancements

1. **Video Integration**: Connect to actual video hosting service
2. **Database Storage**: Implement full database schema for courses and progress
3. **Admin Course Builder**: Interface for creating and editing courses
4. **Advanced Analytics**: Detailed learning analytics and insights
5. **Certificates**: Generate downloadable PDF certificates
6. **Social Features**: Leaderboards, discussion forums, peer reviews
7. **Mobile App**: Native mobile training experience
8. **Live Sessions**: Scheduled live training webinars
9. **Continuing Education**: Track required hours for license renewal
10. **Custom Tracks**: Personalized learning paths based on captain experience

## Best Practices

1. Complete courses in order of difficulty (beginner → intermediate → advanced)
2. Take notes during video lessons for quiz preparation
3. Review incorrect quiz answers to reinforce learning
4. Complete all courses to maximize captain credibility
5. Display earned certifications prominently on profile
6. Retake courses periodically to stay current with best practices

## Support

For questions about the training academy:
- Email: training@gulfcoastcharters.com
- Phone: (555) 123-4567
- Live chat support available in captain dashboard
