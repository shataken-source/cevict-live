'use client';

import React, { useState, useEffect } from 'react';
import { Fish, Activity, Clock, MapPin } from 'lucide-react';

interface CatchReport {
  date: string;
  time: string;
  location: string;
  species: string;
  action: string;
  captain: string;
}

const mockDailyReports: CatchReport[] = [
  {
    date: "Dec 19",
    time: "2:30 PM",
    location: "Spanish Mackerel near the Jetties",
    species: "Spanish Mackerel",
    action: "Action was hot today",
    captain: "Capt. Mike"
  },
  {
    date: "Dec 19",
    time: "11:45 AM",
    location: "Offshore 20 miles",
    species: "Red Snapper",
    action: "Limited out with 8 keepers",
    captain: "Capt. Sarah"
  },
  {
    date: "Dec 19",
    time: "9:15 AM",
    location: "Back Bay",
    species: "Speckled Trout",
    action: "Nice trout on topwater",
    captain: "Capt. David"
  },
  {
    date: "Dec 18",
    time: "4:00 PM",
    location: "Perdido Pass",
    species: "Flounder",
    action: "Gigging trip successful",
    captain: "Capt. Mike"
  },
  {
    date: "Dec 18",
    time: "1:30 PM",
    location: "Gulf State Park Pier",
    species: "King Mackerel",
    action: "Big kings hitting",
    captain: "Capt. Sarah"
  }
];

export default function LiveCatchTicker() {
  const [currentReport, setCurrentReport] = useState<CatchReport>(mockDailyReports[0]);
  const [reportIndex, setReportIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setReportIndex((prev) => (prev + 1) % mockDailyReports.length);
    }, 5000); // Change report every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentReport(mockDailyReports[reportIndex]);
  }, [reportIndex]);

  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          {/* Live Indicator */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold uppercase tracking-wide">Live Daily Log</span>
          </div>

          {/* Scrolling Report */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-3 animate-pulse">
              <Clock className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-medium">{currentReport.date} - {currentReport.time}</span>
              <span className="text-yellow-300">•</span>
              <MapPin className="w-4 h-4 text-blue-200" />
              <span className="text-sm">{currentReport.location}</span>
              <span className="text-yellow-300">•</span>
              <Fish className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-medium">{currentReport.species}</span>
              <span className="text-yellow-300">•</span>
              <Activity className="w-4 h-4 text-blue-200" />
              <span className="text-sm italic">{currentReport.action}</span>
              <span className="text-yellow-300">•</span>
              <span className="text-sm text-blue-200">{currentReport.captain}</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => setReportIndex((prev) => (prev + 1) % mockDailyReports.length)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors"
            >
              Next Report →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
