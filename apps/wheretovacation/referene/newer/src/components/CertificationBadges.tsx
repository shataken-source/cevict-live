import { Shield, FileCheck, Anchor, Heart, Ship, Award, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CertificationBadgesProps {
  certifications: {
    uscg_license?: boolean;
    insurance?: boolean;
    first_aid?: boolean;
    cpr?: boolean;
    safety_cert?: boolean;
    master_captain?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
}

export default function CertificationBadges({ certifications, size = 'md' }: CertificationBadgesProps) {
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
  const badgeSize = size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-10 h-10' : 'w-12 h-12';

  const badges = [
    { key: 'uscg_license', icon: Anchor, label: 'USCG Licensed', color: 'bg-blue-500' },
    { key: 'insurance', icon: Shield, label: 'Insured', color: 'bg-green-500' },
    { key: 'first_aid', icon: Heart, label: 'First Aid Certified', color: 'bg-red-500' },
    { key: 'cpr', icon: Heart, label: 'CPR Certified', color: 'bg-pink-500' },
    { key: 'safety_cert', icon: FileCheck, label: 'Safety Certified', color: 'bg-orange-500' },
    { key: 'master_captain', icon: Award, label: 'Master Captain', color: 'bg-purple-500' }
  ];

  return (
    <TooltipProvider>
      <div className="flex gap-2 flex-wrap">
        {badges.map(({ key, icon: Icon, label, color }) => {
          if (!certifications[key as keyof typeof certifications]) return null;
          
          return (
            <Tooltip key={key}>
              <TooltipTrigger>
                <div className={`${badgeSize} ${color} rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform`}>
                  <Icon size={iconSize} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-400" />
                  <span>{label}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}