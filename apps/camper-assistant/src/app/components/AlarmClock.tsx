'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, Volume2, Music, Pause, Play, Trash2 } from 'lucide-react';

export default function AlarmClock() {
  const [alarms, setAlarms] = useState([
    { id: 1, time: '06:00', label: 'Wake up', active: true, repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { id: 2, time: '17:30', label: 'Sunset photos', active: false, repeat: [] },
  ]);
  const [newAlarm, setNewAlarm] = useState('07:00');
  const [newLabel, setNewLabel] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addAlarm = () => {
    setAlarms([...alarms, {
      id: Date.now(),
      time: newAlarm,
      label: newLabel || 'Alarm',
      active: true,
      repeat: [],
    }]);
    setNewLabel('');
  };

  const deleteAlarm = (id: number) => {
    setAlarms(alarms.filter(a => a.id !== id));
  };

  const toggleAlarm = (id: number) => {
    setAlarms(alarms.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  // Sound options for alarm
  const sounds = [
    { id: 'birds', name: 'Birds Chirping', icon: Music },
    { id: 'waves', name: 'Ocean Waves', icon: Music },
    { id: 'forest', name: 'Forest Morning', icon: Music },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-6 h-6 text-red-400" />
          <h2 className="text-xl font-semibold">Alarm Clock</h2>
        </div>
        <p className="text-slate-400">Never miss sunrise, sunset, or important reminders.</p>
      </div>

      {/* Current Time Display */}
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
        <div className="text-6xl font-bold text-white mb-2">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-slate-400">
          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Add New Alarm */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-medium mb-4">Add New Alarm</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="time"
            value={newAlarm}
            onChange={(e) => setNewAlarm(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-xl"
          />
          <input
            type="text"
            placeholder="Label (e.g., Sunrise)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 min-w-[150px] bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
          />
          <button
            onClick={addAlarm}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium"
          >
            Add Alarm
          </button>
        </div>
      </div>

      {/* Alarms List */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-medium mb-4">Your Alarms</h3>
        {alarms.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No alarms set</p>
        ) : (
          <div className="space-y-3">
            {alarms.map((alarm) => (
              <div key={alarm.id} className="flex items-center justify-between bg-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold">{alarm.time}</div>
                  <div>
                    <div className="font-medium">{alarm.label}</div>
                    {alarm.repeat.length > 0 && (
                      <div className="text-xs text-slate-400">{alarm.repeat.join(', ')}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleAlarm(alarm.id)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      alarm.active ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      alarm.active ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                  <button
                    onClick={() => deleteAlarm(alarm.id)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sleep Timer */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium">Sleep Timer</h3>
        </div>
        <p className="text-sm text-slate-400 mb-3">Play nature sounds to help you fall asleep</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sounds.map((sound) => (
            <button
              key={sound.id}
              onClick={() => setPlaying(playing === sound.id ? null : sound.id)}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
                playing === sound.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {playing === sound.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {sound.name}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Sunrise', 'Sunset', 'Lunch', 'Bedtime'].map((preset) => (
          <button
            key={preset}
            onClick={() => {
              const times: Record<string, string> = {
                'Sunrise': '06:30',
                'Sunset': '18:45',
                'Lunch': '12:00',
                'Bedtime': '22:00',
              };
              setNewAlarm(times[preset]);
              setNewLabel(preset);
            }}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-3 text-center"
          >
            <Clock className="w-5 h-5 mx-auto mb-1 text-slate-400" />
            <div className="text-sm font-medium">{preset}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
