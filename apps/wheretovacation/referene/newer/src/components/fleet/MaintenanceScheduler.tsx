import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface MaintenanceSchedulerProps {
  boatId: string;
  maintenance: any[];
  onAdd: (data: any) => void;
}

export function MaintenanceScheduler({ boatId, maintenance, onAdd }: MaintenanceSchedulerProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    task_name: '', description: '', next_due: '', priority: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setShowForm(false);
    setFormData({ task_name: '', description: '', next_due: '', priority: 'medium' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Maintenance Schedule</CardTitle>
          <Button onClick={() => setShowForm(!showForm)}>Add Task</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 border rounded space-y-3">
            <div>
              <Label>Task Name</Label>
              <Input value={formData.task_name} onChange={(e) => setFormData({...formData, task_name: e.target.value})} required />
            </div>
            <div>
              <Label>Next Due Date</Label>
              <Input type="date" value={formData.next_due} onChange={(e) => setFormData({...formData, next_due: e.target.value})} required />
            </div>
            <Button type="submit">Add Task</Button>
          </form>
        )}
        
        <div className="space-y-2">
          {maintenance.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                {task.status === 'completed' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-orange-500" />}
                <div>
                  <p className="font-medium">{task.task_name}</p>
                  <p className="text-sm text-muted-foreground">Due: {task.next_due}</p>
                </div>
              </div>
              <Badge variant={task.priority === 'high' ? 'destructive' : 'default'}>{task.priority}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
