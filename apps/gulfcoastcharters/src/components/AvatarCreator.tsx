import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

const avatarStyles = [
  { id: 'avatar1', bg: 'bg-blue-500', icon: '👤' },
  { id: 'avatar2', bg: 'bg-green-500', icon: '🧑' },
  { id: 'avatar3', bg: 'bg-purple-500', icon: '👩' },
  { id: 'avatar4', bg: 'bg-orange-500', icon: '👨' },
  { id: 'avatar5', bg: 'bg-pink-500', icon: '🙋' },
  { id: 'avatar6', bg: 'bg-indigo-500', icon: '🧔' },
  { id: 'avatar7', bg: 'bg-red-500', icon: '👱' },
  { id: 'avatar8', bg: 'bg-teal-500', icon: '🧑‍🦱' },
];

interface AvatarCreatorProps {
  currentAvatar?: string;
  onSave: (avatarId: string) => void;
}

export default function AvatarCreator({ currentAvatar, onSave }: AvatarCreatorProps) {
  const [selected, setSelected] = useState(currentAvatar || 'avatar1');

  const handleSave = () => {
    onSave(selected);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Choose Your Avatar</h2>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {avatarStyles.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => setSelected(avatar.id)}
            className={`${avatar.bg} w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all ${
              selected === avatar.id ? 'ring-4 ring-blue-600 scale-110' : 'hover:scale-105'
            }`}
          >
            {avatar.icon}
          </button>
        ))}
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Avatar
      </Button>
    </Card>
  );
}
