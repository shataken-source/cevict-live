'use client';

import { useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Wind, Flame, CloudRain, Moon, Waves, Brain, Bed, Eye, Zap } from 'lucide-react';

interface SoundPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  type: 'nature' | 'binaural';
  description: string;
  frequency?: { left: number; right: number; carrier: number };
}

const PRESETS: SoundPreset[] = [
  // Nature Sounds
  { id: 'rain', name: 'Rain on Tent', icon: <CloudRain className="w-5 h-5" />, type: 'nature', description: 'Gentle rainfall on canvas' },
  { id: 'fire', name: 'Campfire', icon: <Flame className="w-5 h-5" />, type: 'nature', description: 'Crackling fire sounds' },
  { id: 'forest', name: 'Forest', icon: <Wind className="w-5 h-5" />, type: 'nature', description: 'Wind through trees' },
  { id: 'night', name: 'Night Sounds', icon: <Moon className="w-5 h-5" />, type: 'nature', description: 'Crickets and nocturnal ambience' },
  { id: 'stream', name: 'Stream', icon: <Waves className="w-5 h-5" />, type: 'nature', description: 'Flowing water' },
  // Binaural Beats
  { id: 'sleep', name: 'Deep Sleep', icon: <Bed className="w-5 h-5" />, type: 'binaural', description: 'Delta waves (2.5Hz) for deep sleep', frequency: { left: 174, right: 171.5, carrier: 174 } },
  { id: 'focus', name: 'Focus', icon: <Zap className="w-5 h-5" />, type: 'binaural', description: 'Gamma waves (40Hz) for concentration', frequency: { left: 528, right: 568, carrier: 528 } },
  { id: 'relax', name: 'Relax', icon: <Eye className="w-5 h-5" />, type: 'binaural', description: 'Alpha waves (10Hz) for relaxation', frequency: { left: 432, right: 442, carrier: 432 } },
  { id: 'meditate', name: 'Meditate', icon: <Brain className="w-5 h-5" />, type: 'binaural', description: 'Theta waves (6Hz) for meditation', frequency: { left: 396, right: 402, carrier: 396 } },
];

export default function SoundGenerator() {
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const noiseNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const stopAllSounds = useCallback(() => {
    oscillatorsRef.current.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch {}
    });
    gainNodesRef.current.forEach(gain => {
      try { gain.disconnect(); } catch {}
    });
    noiseNodesRef.current.forEach(noise => {
      try { noise.stop(); noise.disconnect(); } catch {}
    });
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    noiseNodesRef.current = [];
    setIsPlaying(false);
  }, []);

  const createNoise = (ctx: AudioContext, type: 'white' | 'pink' | 'brown' = 'pink'): AudioBuffer => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        output[i] = white;
      } else if (type === 'pink') {
        // Simple pink noise approximation
        output[i] = (white + (output[i - 1] || 0) * 0.5) * 0.5;
      } else {
        // Brown noise
        output[i] = (white + (output[i - 1] || 0) * 0.95) * 0.1;
      }
    }
    return buffer;
  };

  const playNatureSound = (ctx: AudioContext, soundId: string) => {
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);
    gainNodesRef.current.push(gain);

    if (soundId === 'rain') {
      // Pink noise for rain
      const buffer = createNoise(ctx, 'pink');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      // Lowpass filter for muffled rain sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      noise.connect(filter);
      filter.connect(gain);
      noise.start();
      noiseNodesRef.current.push(noise);
      
    } else if (soundId === 'fire') {
      // Brown noise with modulation for fire crackle
      const buffer = createNoise(ctx, 'brown');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 0.5;
      
      noise.connect(filter);
      filter.connect(gain);
      noise.start();
      noiseNodesRef.current.push(noise);
      
    } else if (soundId === 'forest') {
      // White noise with lowpass for wind
      const buffer = createNoise(ctx, 'white');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      
      noise.connect(filter);
      filter.connect(gain);
      noise.start();
      noiseNodesRef.current.push(noise);
      
    } else if (soundId === 'night') {
      // Low amplitude pink noise for night ambience
      const buffer = createNoise(ctx, 'pink');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      
      gain.gain.value = volume * 0.5; // Quieter
      
      noise.connect(filter);
      filter.connect(gain);
      noise.start();
      noiseNodesRef.current.push(noise);
      
    } else if (soundId === 'stream') {
      // White noise with bandpass for water
      const buffer = createNoise(ctx, 'white');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.3;
      
      noise.connect(filter);
      filter.connect(gain);
      noise.start();
      noiseNodesRef.current.push(noise);
    }
  };

  const playBinauralBeat = (ctx: AudioContext, freq: { left: number; right: number; carrier: number }) => {
    // Left ear oscillator
    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.value = freq.left;
    
    // Right ear oscillator  
    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.value = freq.right;
    
    // Stereo panner for left
    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;
    
    // Stereo panner for right
    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1;
    
    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.3; // Binaural beats should be quieter
    
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
    gainNodesRef.current.push(masterGain);
  };

  const toggleSound = (soundId: string) => {
    const ctx = initAudioContext();
    
    if (activeSound === soundId && isPlaying) {
      // Stop current sound
      stopAllSounds();
      setActiveSound(null);
      return;
    }
    
    // Stop any playing sound
    stopAllSounds();
    
    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const preset = PRESETS.find(p => p.id === soundId);
    if (!preset) return;
    
    if (preset.type === 'nature') {
      playNatureSound(ctx, soundId);
    } else if (preset.type === 'binaural' && preset.frequency) {
      playBinauralBeat(ctx, preset.frequency);
    }
    
    setActiveSound(soundId);
    setIsPlaying(true);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    gainNodesRef.current.forEach(gain => {
      gain.gain.setTargetAtTime(newVolume, audioContextRef.current!.currentTime, 0.1);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Volume2 className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-semibold">Sound Generator</h2>
        </div>
        <p className="text-slate-400">Nature sounds and binaural beats for camping ambience.</p>
      </div>

      {/* Volume Control */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleVolumeChange(volume === 0 ? 0.3 : 0)}
            className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-slate-400 w-12">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      {/* Nature Sounds */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Wind className="w-5 h-5 text-emerald-400" />
          Nature Sounds
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESETS.filter(p => p.type === 'nature').map((preset) => (
            <button
              key={preset.id}
              onClick={() => toggleSound(preset.id)}
              className={`p-4 rounded-xl border transition-all ${
                activeSound === preset.id
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {preset.icon}
                <span className="text-sm font-medium">{preset.name}</span>
                <span className="text-xs text-slate-400">{preset.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Binaural Beats */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Binaural Beats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESETS.filter(p => p.type === 'binaural').map((preset) => (
            <button
              key={preset.id}
              onClick={() => toggleSound(preset.id)}
              className={`p-4 rounded-xl border transition-all ${
                activeSound === preset.id
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {preset.icon}
                <span className="text-sm font-medium">{preset.name}</span>
                <span className="text-xs text-slate-400">{preset.description}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Use headphones for best binaural beat experience. Start at low volume.
        </p>
      </div>
    </div>
  );
}
