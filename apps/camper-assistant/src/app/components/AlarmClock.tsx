'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Clock, Volume2, Pause, Play, Trash2, Bed, Zap, Eye } from 'lucide-react';

export default function AlarmClock() {
  const [alarms, setAlarms] = useState([
    { id: 1, time: '06:00', label: 'Wake up', active: true, repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { id: 2, time: '17:30', label: 'Sunset photos', active: false, repeat: [] },
  ]);
  const [newAlarm, setNewAlarm] = useState('07:00');
  const [newLabel, setNewLabel] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [playing, setPlaying] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const noiseNodesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stopAllSounds = useCallback(() => {
    oscillatorsRef.current.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch { }
    });
    noiseNodesRef.current.forEach(noise => {
      try { noise.stop(); noise.disconnect(); } catch { }
    });
    oscillatorsRef.current = [];
    noiseNodesRef.current = [];
  }, []);

  const createNoise = (ctx: AudioContext): AudioBuffer => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const createColorNoise = (ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'white') {
        output[i] = white;
      } else if (type === 'pink') {
        // Pink noise: 1/f spectrum
        output[i] = (white + (output[i - 1] || 0)) * 0.5;
      } else {
        // Brown noise: 1/f² spectrum
        output[i] = (white + (output[i - 1] || 0) * 0.95) * 0.1;
      }
    }
    return buffer;
  };

  const playSound = (soundId: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    stopAllSounds();

    // Color noise for sound masking
    if (soundId === 'white' || soundId === 'pink' || soundId === 'brown') {
      const buffer = createColorNoise(ctx, soundId);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = 0.3;

      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noiseNodesRef.current.push(noise);

    } else if (soundId === 'sleep') {
      // Delta waves: 2.5Hz difference (174 left, 171.5 right)
      playBinauralBeat(ctx, 174, 171.5, 0.2);
    } else if (soundId === 'focus') {
      // Gamma waves: 40Hz difference (528 left, 568 right)
      playBinauralBeat(ctx, 528, 568, 0.15);
    } else if (soundId === 'relax') {
      // Alpha waves: 10Hz difference (432 left, 442 right)
      playBinauralBeat(ctx, 432, 442, 0.2);
    }
  };

  const playBinauralBeat = (ctx: AudioContext, leftFreq: number, rightFreq: number, volume: number) => {
    // Left ear
    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.value = leftFreq;

    // Right ear
    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.value = rightFreq;

    // Panners
    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;

    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;

    // Connect left
    leftOsc.connect(leftPan);
    leftPan.connect(masterGain);

    // Connect right
    rightOsc.connect(rightPan);
    rightPan.connect(masterGain);

    masterGain.connect(ctx.destination);

    leftOsc.start();
    rightOsc.start();

    oscillatorsRef.current.push(leftOsc, rightOsc);
  };

  const toggleSound = (soundId: string) => {
    if (playing === soundId) {
      stopAllSounds();
      setPlaying(null);
    } else {
      playSound(soundId);
      setPlaying(soundId);
    }
  };

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

  // Sound options - Color noise for masking, Binaural beats for focus/sleep
  const sounds = [
    { id: 'white', name: 'White Noise', icon: Volume2, description: 'Full spectrum masking' },
    { id: 'pink', name: 'Pink Noise', icon: Volume2, description: 'Balanced, natural' },
    { id: 'brown', name: 'Brown Noise', icon: Volume2, description: 'Deep, rumbling' },
    { id: 'sleep', name: 'Deep Sleep', icon: Bed, description: 'Delta 2.5Hz - Headphones' },
    { id: 'focus', name: 'Focus', icon: Zap, description: 'Gamma 40Hz - Headphones' },
    { id: 'relax', name: 'Relax', icon: Eye, description: 'Alpha 10Hz - Headphones' },
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
                    className={`w-12 h-6 rounded-full transition-colors ${alarm.active ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${alarm.active ? 'translate-x-7' : 'translate-x-1'
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
          <h3 className="font-medium">Sound Masking & Binaural Beats</h3>
        </div>
        <p className="text-sm text-slate-400 mb-3">Color noise drowns out distractions. Binaural beats require headphones.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sounds.map((sound) => {
            const Icon = sound.icon;
            return (
              <button
                key={sound.id}
                onClick={() => toggleSound(sound.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${playing === sound.id
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{sound.name}</span>
                <span className="text-xs text-slate-400 text-center">{sound.description}</span>
              </button>
            );
          })}
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
