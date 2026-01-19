import { MessageCircle, Search, User, GitCompare, Home, MapPin, Mail, Anchor, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';



interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onShowCrawler?: () => void;
  onShowMessageBoard?: () => void;
  onShowAuth?: () => void;
  onShowProfile?: () => void;
  onShowComparison?: () => void;
  isAuthenticated?: boolean;
  userName?: string;
  compareCount?: number;
  userLevel?: number;
}


export default function MobileMenu({ 
  isOpen, 
  onClose, 
  onShowCrawler,
  onShowMessageBoard,
  onShowAuth,
  onShowProfile,
  onShowComparison,
  isAuthenticated,
  userName,
  compareCount = 0,
  userLevel = 10
}: MobileMenuProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNavClick = (action?: () => void, scrollToTop?: boolean, hash?: string) => {
    if (action) {
      action();
    } else if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    onClose();
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onClose}>
      <div className="bg-gradient-to-b from-blue-900 to-purple-900 text-white w-64 h-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 flex justify-between items-center border-b border-white/20">
          <h2 className="text-xl font-bold">Menu</h2>
          <button onClick={onClose} className="text-2xl hover:text-gray-300">×</button>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button onClick={() => handleNavClick(undefined, true)} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                <Home className="w-5 h-5 mr-3" />
                Home
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick(undefined, false, '#charters')} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                <Anchor className="w-5 h-5 mr-3" />
                Charters
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick(undefined, false, '#destinations')} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                <MapPin className="w-5 h-5 mr-3" />
                Destinations
              </button>
            </li>
            <li>
              <button onClick={() => {
                navigate('/community');
                onClose();
              }} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                <Users className="w-5 h-5 mr-3" />
                Community
              </button>
            </li>
            <li>
              <button onClick={() => {
                navigate('/apply-captain');
                onClose();
              }} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                <Anchor className="w-5 h-5 mr-3" />
                Become a Captain
              </button>
            </li>
            <li>
              <button onClick={() => {
                navigate('/captain-login');
                onClose();
              }} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                <User className="w-5 h-5 mr-3" />
                Captain Login
              </button>
            </li>



            {userLevel === 1 && (
              <li>
                <button onClick={() => handleNavClick(onShowCrawler)} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                  <Search className="w-5 h-5 mr-3" />
                  AI Crawler
                </button>
              </li>
            )}


            {compareCount > 0 && (
              <li>
                <button onClick={() => handleNavClick(onShowComparison)} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                  <GitCompare className="w-5 h-5 mr-3" />
                  Compare ({compareCount})
                </button>
              </li>
            )}
            <li>
              <button onClick={() => handleNavClick(isAuthenticated ? onShowProfile : onShowAuth)} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                <User className="w-5 h-5 mr-3" />
                {isAuthenticated ? userName : 'Login'}
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick(undefined, '#contact')} className="flex items-center w-full text-left py-3 px-3 hover:bg-white/10 rounded transition">
                <Mail className="w-5 h-5 mr-3" />
                Contact
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
