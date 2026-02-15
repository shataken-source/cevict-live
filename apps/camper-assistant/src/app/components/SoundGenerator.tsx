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
      try { osc.stop(); osc.disconnect(); } catch { }
    });
    gainNodesRef.current.forEach(gain => {
      try { gain.disconnect(); } catch { }
    });
    noiseNodesRef.current.forEach(noise => {
      try { noise.stop(); noise.disconnect(); } catch { }
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
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    gainNodesRef.current.push(masterGain);

    if (soundId === 'rain') {
      // Rain: Pink noise with dynamic filtering + high-freq "droplets"
      const buffer = createNoise(ctx, 'pink');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Variable lowpass for "patter" effect
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      filter.Q.value = 0.5;

      // LFO to modulate filter for dynamic rain
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5; // Slow modulation
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 600;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      // Add high-freq "droplets" layer
      const dropletBuffer = createNoise(ctx, 'white');
      const droplets = ctx.createBufferSource();
      droplets.buffer = dropletBuffer;
      droplets.loop = true;
      const dropletFilter = ctx.createBiquadFilter();
      dropletFilter.type = 'highpass';
      dropletFilter.frequency.value = 3000;
      const dropletGain = ctx.createGain();
      dropletGain.gain.value = 0.3; // Subtle

      noise.connect(filter);
      filter.connect(masterGain);
      droplets.connect(dropletFilter);
      dropletFilter.connect(dropletGain);
      dropletGain.connect(masterGain);

      noise.start();
      droplets.start();
      noiseNodesRef.current.push(noise, droplets);
      oscillatorsRef.current.push(lfo);

    } else if (soundId === 'fire') {
      // Fire: Brown noise base + periodic "crackle" bursts
      const buffer = createNoise(ctx, 'brown');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      // Crackle generator using short noise bursts
      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0;

      // Create crackle burst schedule
      const scheduleCrackle = () => {
        const crackleBuffer = createNoise(ctx, 'white');
        const crackle = ctx.createBufferSource();
        crackle.buffer = crackleBuffer;

        const crackleFilter = ctx.createBiquadFilter();
        crackleFilter.type = 'bandpass';
        crackleFilter.frequency.value = 2000;
        crackleFilter.Q.value = 1;

        const singleCrackleGain = ctx.createGain();
        singleCrackleGain.gain.setValueAtTime(0, ctx.currentTime);
        singleCrackleGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
        singleCrackleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        crackle.connect(crackleFilter);
        crackleFilter.connect(singleCrackleGain);
        singleCrackleGain.connect(masterGain);

        crackle.start();
        crackle.stop(ctx.currentTime + 0.2);

        // Schedule next crackle randomly (every 0.1 to 2 seconds)
        setTimeout(scheduleCrackle, Math.random() * 1900 + 100);
      };

      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      noiseNodesRef.current.push(noise);

      // Start crackle loop
      scheduleCrackle();

    } else if (soundId === 'forest') {
      // Forest: Wind gusts using filtered white noise with slow LFO
      const buffer = createNoise(ctx, 'white');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Bandpass for wind "whoosh" quality
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 0.3;

      // Slow LFO for wind gusts
      const lfo = ctx.createOscillator();
      lfo.type = 'triangle';
      lfo.frequency.value = 0.15; // Very slow - 6 second cycle
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 300;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      // Add occasional "rustle" (high freq bursts)
      const rustleFilter = ctx.createBiquadFilter();
      rustleFilter.type = 'highpass';
      rustleFilter.frequency.value = 2000;
      const rustleGain = ctx.createGain();
      rustleGain.gain.value = 0.2;

      noise.connect(filter);
      filter.connect(masterGain);
      noise.connect(rustleFilter);
      rustleFilter.connect(rustleGain);
      rustleGain.connect(masterGain);

      noise.start();
      noiseNodesRef.current.push(noise);
      oscillatorsRef.current.push(lfo);

    } else if (soundId === 'night') {
      // Night: Crickets using oscillators + subtle ambience
      const numCrickets = 3;

      for (let i = 0; i < numCrickets; i++) {
        // Each cricket: high freq oscillator with pulsing
        const cricket = ctx.createOscillator();
        cricket.type = 'sawtooth';
        cricket.frequency.value = 3500 + (i * 200); // Different pitches

        // Pulsing envelope
        const cricketGain = ctx.createGain();
        cricketGain.gain.value = 0;

        // Create chirping pattern
        const chirpInterval = 0.8 + (i * 0.3); // Different rates
        const chirpDuration = 0.05;

        // LFO for pulsing
        const chirpLfo = ctx.createOscillator();
        chirpLfo.type = 'square';
        chirpLfo.frequency.value = 1 / chirpInterval;
        const chirpLfoGain = ctx.createGain();
        chirpLfoGain.gain.value = 0.03; // Low amplitude

        // Bandpass for cricket "chirp" quality
        const cricketFilter = ctx.createBiquadFilter();
        cricketFilter.type = 'bandpass';
        cricketFilter.frequency.value = 3500;
        cricketFilter.Q.value = 10;

        chirpLfo.connect(chirpLfoGain);
        cricket.connect(cricketFilter);
        cricketFilter.connect(chirpLfoGain);
        chirpLfoGain.connect(masterGain);

        // Pan crickets left/right for stereo
        const panner = ctx.createStereoPanner();
        panner.pan.value = (i - 1) * 0.7; // Left, center, right
        chirpLfoGain.disconnect();
        chirpLfoGain.connect(panner);
        panner.connect(masterGain);

        cricket.start();
        chirpLfo.start();
        oscillatorsRef.current.push(cricket, chirpLfo);
      }

      // Subtle background hum
      const buffer = createNoise(ctx, 'pink');
      const bgNoise = ctx.createBufferSource();
      bgNoise.buffer = buffer;
      bgNoise.loop = true;

      const bgFilter = ctx.createBiquadFilter();
      bgFilter.type = 'lowpass';
      bgFilter.frequency.value = 200;
      const bgGain = ctx.createGain();
      bgGain.gain.value = 0.15;

      bgNoise.connect(bgFilter);
      bgFilter.connect(bgGain);
      bgGain.connect(masterGain);
      bgNoise.start();
      noiseNodesRef.current.push(bgNoise);

    } else if (soundId === 'stream') {
      // Stream: White noise with "burbling" modulation
      const buffer = createNoise(ctx, 'white');
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Multiple bandpass filters for water texture
      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'bandpass';
      filter1.frequency.value = 600;
      filter1.Q.value = 0.5;

      const filter2 = ctx.createBiquadFilter();
      filter2.type = 'highpass';
      filter2.frequency.value = 1500;

      // LFO for "burbling" effect
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2; // Water ripple rate
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 200;
      lfo.connect(lfoGain);
      lfoGain.connect(filter1.frequency);
      lfo.start();

      // Gain modulation for splashing effect
      const splashLfo = ctx.createOscillator();
      splashLfo.type = 'sine';
      splashLfo.frequency.value = 0.4; // Slow splash cycle
      const splashGain = ctx.createGain();
      splashGain.gain.value = 0.1;
      splashLfo.connect(splashGain);

      const streamGain = ctx.createGain();
      streamGain.gain.value = 0.7;
      splashGain.connect(streamGain.gain);

      noise.connect(filter1);
      noise.connect(filter2);
      filter1.connect(streamGain);
      filter2.connect(streamGain);
      streamGain.connect(masterGain);

      noise.start();
      splashLfo.start();
      noiseNodesRef.current.push(noise);
      oscillatorsRef.current.push(lfo, splashLfo);
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
              className={`p-4 rounded-xl border transition-all ${activeSound === preset.id
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
              className={`p-4 rounded-xl border transition-all ${activeSound === preset.id
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
