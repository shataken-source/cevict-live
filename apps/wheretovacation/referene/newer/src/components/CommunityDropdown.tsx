import { useState } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CommunityDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/community');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleNavigate}
        className="flex items-center gap-1 hover:text-blue-100 transition font-medium"
      >
        <Users className="w-4 h-4" />
        Community
      </button>
    </div>
  );
}
