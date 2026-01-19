/**
 * SocialMediaBar Component
 * 
 * Enterprise-grade social media sidebar with support for all major platforms
 * Displays fixed social media icons on desktop viewports for easy access
 * 
 * Features:
 * - Dynamic platform loading from site settings
 * - Truth Social and TikTok support
 * - Responsive design (hidden on mobile)
 * - Smooth hover animations
 * - Accessibility compliant
 * 
 * @component
 */

import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

// Custom SVG icons for platforms not in lucide-react
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const TruthSocialIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.5 3.5h17v17h-17z"/>
    <text x="12" y="16" fontSize="14" fontWeight="bold" textAnchor="middle" fill="white">T</text>
  </svg>
);

export default function SocialMediaBar() {
  const { settings } = useSiteSettings();
  
  // Define all social media platforms with their configurations
  const socialLinks = [
    settings.facebook && { 
      icon: Facebook, 
      href: settings.facebook, 
      label: 'Facebook',
      color: 'hover:bg-blue-600'
    },
    settings.twitter && { 
      icon: Twitter, 
      href: settings.twitter, 
      label: 'Twitter',
      color: 'hover:bg-sky-500'
    },
    settings.instagram && { 
      icon: Instagram, 
      href: settings.instagram, 
      label: 'Instagram',
      color: 'hover:bg-pink-600'
    },
    settings.tiktok && { 
      icon: TikTokIcon, 
      href: settings.tiktok, 
      label: 'TikTok',
      color: 'hover:bg-black'
    },
    settings.truthsocial && { 
      icon: TruthSocialIcon, 
      href: settings.truthsocial, 
      label: 'Truth Social',
      color: 'hover:bg-red-600'
    },
    settings.linkedin && { 
      icon: Linkedin, 
      href: settings.linkedin, 
      label: 'LinkedIn',
      color: 'hover:bg-blue-700'
    },
    settings.youtube && { 
      icon: Youtube, 
      href: settings.youtube, 
      label: 'YouTube',
      color: 'hover:bg-red-600'
    },
  ].filter(Boolean);

  // Don't render if no social links configured
  if (socialLinks.length === 0) return null;

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col gap-2">
      {socialLinks.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`bg-white/90 backdrop-blur-sm ${social.color} text-gray-700 hover:text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 group`}
          aria-label={`Follow us on ${social.label}`}
        >
          <social.icon className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
}
