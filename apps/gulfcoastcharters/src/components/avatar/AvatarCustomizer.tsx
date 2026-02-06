import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import AvatarDisplay from './AvatarDisplay';

interface AvatarCustomizerProps {
  userId: string;
  initialData?: any;
  onSave?: (avatarData: any) => void;
  onCancel?: () => void;
}

const skinTones = ['#ffd6a5', '#f5d0a9', '#d4a574', '#c68642', '#8d5524', '#5c3317'];
const hairColors = ['#1a1a1a', '#4a3728', '#8b4513', '#daa520', '#ff6347', '#9370db'];
const hairStyles = ['short', 'long', 'bald', 'curly'];

export default function AvatarCustomizer({ userId, initialData, onSave, onCancel }: AvatarCustomizerProps) {
  const [sex, setSex] = useState(initialData?.sex || 'male');
  const [skinColor, setSkinColor] = useState(initialData?.skin_color || '#f5d0a9');
  const [hairStyle, setHairStyle] = useState(initialData?.hair_style || 'short');
  const [hairColor, setHairColor] = useState(initialData?.hair_color || '#4a3728');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const avatarData = { 
        user_id: userId,
        sex, 
        skin_color: skinColor, 
        hair_style: hairStyle, 
        hair_color: hairColor 
      };

      const isNewAvatar = !initialData;
      const { error } = initialData
        ? await supabase.from('user_avatars').update(avatarData).eq('user_id', userId)
        : await supabase.from('user_avatars').insert(avatarData);

      if (error) throw error;

      // Award points for avatar creation/customization (gamification)
      try {
        if (isNewAvatar) {
          // First time creating avatar
          await supabase.functions.invoke('points-rewards-system', {
            body: {
              action: 'award_points',
              userId,
              actionType: 'avatar_created',
              amount: 15,
            },
          });
        } else {
          // Updating/customizing avatar
          await supabase.functions.invoke('points-rewards-system', {
            body: {
              action: 'award_points',
              userId,
              actionType: 'avatar_customized',
              amount: 10,
            },
          });
        }
      } catch (pointsError) {
        console.error('Error awarding avatar points:', pointsError);
        // Don't block avatar save if points fail
      }

      // Log analytics
      await supabase.from('avatar_analytics').insert({
        event_type: 'avatar_updated',
        user_id: userId,
        metadata: { sex, skin_color: skinColor, hair_style: hairStyle }
      });

      toast({ 
        title: 'Avatar saved!', 
        description: isNewAvatar 
          ? 'Your avatar has been created! +15 points' 
          : 'Your avatar has been updated! +10 points' 
      });
      if (onSave) onSave(avatarData);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Create Your Avatar</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="flex justify-center items-center">
          <AvatarDisplay
            sex={sex}
            skinColor={skinColor}
            hairStyle={hairStyle}
            hairColor={hairColor}
            size={200}
          />
        </div>
        
        <div className="space-y-6">
          <div>
            <Label className="mb-2 block">Gender</Label>
            <div className="flex gap-2">
              <Button variant={sex === 'male' ? 'default' : 'outline'} onClick={() => setSex('male')}>Male</Button>
              <Button variant={sex === 'female' ? 'default' : 'outline'} onClick={() => setSex('female')}>Female</Button>
              <Button variant={sex === 'other' ? 'default' : 'outline'} onClick={() => setSex('other')}>Other</Button>
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block">Skin Tone</Label>
            <div className="flex gap-2 flex-wrap">
              {skinTones.map(color => (
                <button
                  key={color}
                  onClick={() => setSkinColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${skinColor === color ? 'border-blue-600 scale-110' : 'border-gray-300'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select skin tone ${color}`}
                />
              ))}
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block">Hair Style</Label>
            <div className="flex gap-2">
              {hairStyles.map(style => (
                <Button key={style} variant={hairStyle === style ? 'default' : 'outline'} onClick={() => setHairStyle(style)} className="capitalize">{style}</Button>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block">Hair Color</Label>
            <div className="flex gap-2 flex-wrap">
              {hairColors.map(color => (
                <button
                  key={color}
                  onClick={() => setHairColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${hairColor === color ? 'border-blue-600 scale-110' : 'border-gray-300'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select hair color ${color}`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Save Avatar'}
            </Button>
            {onCancel && <Button onClick={onCancel} variant="outline">Cancel</Button>}
          </div>
        </div>
      </div>
    </Card>
  );
}
