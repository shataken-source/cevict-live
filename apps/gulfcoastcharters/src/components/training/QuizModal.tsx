import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';

interface QuizModalProps {
  onClose: () => void;
  onComplete: (score: number) => void;
}

export default function QuizModal({ onClose, onComplete }: QuizModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const questions = [
    {
      question: 'What is the first priority in any emergency situation at sea?',
      options: ['Contact Coast Guard', 'Ensure passenger safety', 'Save the vessel', 'Document the incident'],
      correct: 1
    },
    {
      question: 'How often should life jackets be inspected?',
      options: ['Annually', 'Before each trip', 'Monthly', 'When damaged'],
      correct: 1
    },
    {
      question: 'What does a red flag warning indicate?',
      options: ['Sharks present', 'Dangerous conditions', 'No swimming', 'Boat traffic'],
      correct: 1
    }
  ];

  const handleSubmit = () => {
    const isCorrect = parseInt(selectedAnswer) === questions[currentQuestion].correct;
    if (isCorrect) setScore(score + 1);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
    } else {
      setShowResult(true);
    }
  };

  const finalScore = Math.round(((score + (parseInt(selectedAnswer) === questions[currentQuestion].correct ? 1 : 0)) / questions.length) * 100);

  if (showResult) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quiz Complete!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            {finalScore >= 70 ? (
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            )}
            <div className="text-4xl font-bold mb-2">{finalScore}%</div>
            <p className="text-gray-600 mb-6">
              {finalScore >= 70 ? 'Great job! You passed!' : 'Keep studying and try again.'}
            </p>
            <Button onClick={() => onComplete(finalScore)} className="w-full">
              {finalScore >= 70 ? 'Continue to Next Lesson' : 'Retry Quiz'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Question {currentQuestion + 1} of {questions.length}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="font-semibold mb-4">{questions[currentQuestion].question}</p>
          <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
            {questions[currentQuestion].options.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <Button onClick={handleSubmit} disabled={!selectedAnswer} className="w-full">
          {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
