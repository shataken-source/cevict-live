import { Shield, Star, Clock, Award, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CaptainVerificationBadgesProps {
  isVerified?: boolean;
  uscgVerified?: boolean;
  uscgVerifiedAt?: string;
  insuranceVerified?: boolean;
  insuranceVerifiedAt?: string;
  isTopRated?: boolean;
  isQuickResponder?: boolean;
  safetyScore?: number;
  yearsExperience?: number;
}



export default function CaptainVerificationBadges({
  isVerified = false,
  uscgVerified = false,
  uscgVerifiedAt,
  insuranceVerified = false,
  insuranceVerifiedAt,
  isTopRated = false,
  isQuickResponder = false,
  safetyScore = 100,
  yearsExperience = 0
}: CaptainVerificationBadgesProps) {

  const formatVerifiedDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {uscgVerified && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                USCG Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>USCG License Verified with National Maritime Center</p>
              {uscgVerifiedAt && <p className="text-xs text-gray-400">Verified: {formatVerifiedDate(uscgVerifiedAt)}</p>}
            </TooltipContent>
          </Tooltip>
        )}
        
        {isVerified && !uscgVerified && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-slate-600 hover:bg-slate-700 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Identity Verified</p>
            </TooltipContent>
          </Tooltip>
        )}

        {insuranceVerified && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Insurance Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Marine Insurance Policy Verified</p>
              {insuranceVerifiedAt && <p className="text-xs text-gray-400">Verified: {formatVerifiedDate(insuranceVerifiedAt)}</p>}
            </TooltipContent>
          </Tooltip>
        )}

        {isTopRated && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-amber-600 hover:bg-amber-700 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Top Rated
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>4.8+ Average Rating</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {isQuickResponder && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Quick Response
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Responds within 2 hours</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {safetyScore === 100 && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Perfect Safety
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>100% Safety Record</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {yearsExperience >= 10 && (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-purple-600 hover:bg-purple-700 flex items-center gap-1">
                <Award className="w-3 h-3" />
                Veteran Captain
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{yearsExperience}+ Years Experience</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
