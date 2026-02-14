import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RotateCcw, Check } from 'lucide-react';

interface SignatureCaptureProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
}

export function SignatureCapture({ onSave, onCancel }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDrawing(true);
    setIsEmpty(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL());
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-2">Inspector Signature</h3>
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="border-2 border-gray-300 rounded w-full touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="flex gap-2 mt-4">
        <Button onClick={clear} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button onClick={save} disabled={isEmpty} size="sm">
          <Check className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button onClick={onCancel} variant="ghost" size="sm">Cancel</Button>
      </div>
    </Card>
  );
}
