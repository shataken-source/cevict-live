'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type CalmCastPreset = {
  id: string;
  label: string;
  tags: string[];
  target: 'HUMAN' | 'PET' | 'BOTH';
  carrierHz: number;
  beatHz: number;
  volumeDb: number;
  fadeInMs: number;
  fadeOutMs: number;
  recommendedMinutes?: number;
  notes?: string;
};

function computeFrequencies(preset: CalmCastPreset) {
  return {
    leftHz: preset.carrierHz,
    rightHz: preset.carrierHz + preset.beatHz,
    beatHz: preset.beatHz
  };
}

function dbToGain(db: number) {
  return Math.pow(10, db / 20);
}

function CalmCastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [presets, setPresets] = useState<CalmCastPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryPresetId = searchParams?.get('preset') || null;
  const [selectedPresetId, setSelectedPresetId] = useState<string>('THUNDER_CALM');

  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<{
    ctx: AudioContext;
    leftOsc: OscillatorNode;
    rightOsc: OscillatorNode;
    gain: GainNode;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/calmcast/presets', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load presets');
        if (cancelled) return;
        setPresets(data.presets || []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load presets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (queryPresetId) {
      setSelectedPresetId(queryPresetId);
    }
  }, [queryPresetId]);

  const selectedPreset = useMemo(() => {
    return presets.find((p) => p.id === selectedPresetId) || presets[0] || null;
  }, [presets, selectedPresetId]);

  const stop = async () => {
    const audio = audioRef.current;
    if (!audio || !selectedPreset) {
      setIsPlaying(false);
      return;
    }

    const now = audio.ctx.currentTime;
    const fadeOutSec = Math.max(selectedPreset.fadeOutMs, 0) / 1000;

    try {
      audio.gain.gain.cancelScheduledValues(now);
      audio.gain.gain.setValueAtTime(audio.gain.gain.value, now);
      audio.gain.gain.linearRampToValueAtTime(0.0001, now + fadeOutSec);

      window.setTimeout(() => {
        try {
          audio.leftOsc.stop();
          audio.rightOsc.stop();
        } catch {}
        try {
          audio.ctx.close();
        } catch {}
        audioRef.current = null;
      }, Math.max(selectedPreset.fadeOutMs, 0) + 50);
    } finally {
      setIsPlaying(false);
    }
  };

  const play = async () => {
    if (!selectedPreset) return;

    if (isPlaying) {
      await stop();
      return;
    }

    const { leftHz, rightHz } = computeFrequencies(selectedPreset);

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    await ctx.resume();

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.value = leftHz;

    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.value = rightHz;

    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;

    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1;

    leftOsc.connect(leftPan).connect(gain);
    rightOsc.connect(rightPan).connect(gain);

    gain.connect(ctx.destination);

    leftOsc.start();
    rightOsc.start();

    const now = ctx.currentTime;
    const fadeInSec = Math.max(selectedPreset.fadeInMs, 0) / 1000;
    const targetGain = Math.min(dbToGain(selectedPreset.volumeDb), 1.0);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + fadeInSec);

    audioRef.current = { ctx, leftOsc, rightOsc, gain };
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (!selectedPreset) return;
    const audio = audioRef.current;
    if (!audio) return;

    const { leftHz, rightHz } = computeFrequencies(selectedPreset);
    const now = audio.ctx.currentTime;

    audio.leftOsc.frequency.setTargetAtTime(leftHz, now, 0.05);
    audio.rightOsc.frequency.setTargetAtTime(rightHz, now, 0.05);

    const targetGain = Math.min(dbToGain(selectedPreset.volumeDb), 1.0);
    audio.gain.gain.setTargetAtTime(targetGain, now, 0.1);
  }, [isPlaying, selectedPresetId, selectedPreset]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        audio.leftOsc.stop();
        audio.rightOsc.stop();
      } catch {}
      try {
        audio.ctx.close();
      } catch {}
      audioRef.current = null;
    };
  }, []);

  const onSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    const sp = new URLSearchParams(searchParams?.toString() || '');
    sp.set('preset', id);
    router.replace(`/calmcast?${sp.toString()}`);
  };

  return (
    <div style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>CalmCast</h1>
        <p style={{ color: '#555', marginTop: 0, marginBottom: 24 }}>
          Choose a mode and press Play. For pets, use speakers at low volume. For binaural effects, humans should use headphones.
        </p>

        {loading ? (
          <div style={{ padding: 16, background: '#f4f4f5', borderRadius: 12 }}>Loading presets…</div>
        ) : error ? (
          <div style={{ padding: 16, background: '#fee2e2', borderRadius: 12, color: '#991b1b' }}>{error}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 700 }}>Preset</label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => onSelectPreset(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', minWidth: 260 }}
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={play}
                  disabled={!selectedPreset}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: isPlaying ? '#ef4444' : '#10b981',
                    color: 'white',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {isPlaying ? 'Stop' : 'Play'}
                </button>
              </div>

              {selectedPreset && (
                <div style={{ marginTop: 14, color: '#444' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{selectedPreset.label}</div>
                  <div style={{ fontSize: 14 }}>
                    Target: {selectedPreset.target} | Carrier: {selectedPreset.carrierHz}Hz | Beat: {selectedPreset.beatHz}Hz | Volume: {selectedPreset.volumeDb}dB
                  </div>
                  {selectedPreset.notes ? (
                    <div style={{ marginTop: 8, fontSize: 14, color: '#555' }}>{selectedPreset.notes}</div>
                  ) : null}
                </div>
              )}
            </div>

            <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Share link</div>
              <div style={{ fontSize: 14, color: '#555' }}>
                Use a URL like:
                <div style={{ marginTop: 8, padding: 12, background: '#f4f4f5', borderRadius: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  /calmcast?preset={encodeURIComponent(selectedPresetId)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalmCastPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', padding: 24 }}>Loading…</div>}>
      <CalmCastInner />
    </Suspense>
  );
}
