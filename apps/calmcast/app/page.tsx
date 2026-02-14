export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 16 }}>
        <h1 style={{ fontSize: 34, fontWeight: 900 }}>CalmCast</h1>
        <p style={{ color: '#444', lineHeight: 1.5 }}>
          Scientifically-backed audio regulation service with 10 specialized presets for sleep, focus, anxiety relief, pet calming, and more. 
          Use the endpoints below from any product (pets, dispatch, ops rooms, waiting rooms, etc.).
        </p>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Core endpoints</div>
          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, color: '#111827', display: 'grid', gap: 6 }}>
            <div>GET /api/calmcast/presets</div>
            <div>POST /api/calmcast/generate</div>
            <div>GET|POST /api/calmcast/render-wav</div>
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>&#x1F9EC; Scientific Presets</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
              <strong>DEEP_SLEEP_DELTA</strong> - 174Hz + 2.5Hz Delta waves
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Deep restorative sleep, pain relief</div>
            </div>
            <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
              <strong>FOCUS_GAMMA</strong> - 528Hz + 40Hz Gamma waves  
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Enhanced concentration, memory, cognition</div>
            </div>
            <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
              <strong>DOG_CALMING_432</strong> - 432Hz + 6Hz Theta waves
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Nature frequency for canine anxiety</div>
            </div>
            <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
              <strong>BABY_SOOTHING_174</strong> - 174Hz + 4Hz Theta waves
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Ultra-gentle infant calming</div>
            </div>
            <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
              <strong>STORM_ANXIETY_528</strong> - 528Hz + 7Hz Theta waves
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Emergency calming for storms/fireworks</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
            <strong>5 more presets available:</strong> Anxiety Relief, Cat Soothing, Meditation, Pain Relief, Creativity
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>&#x1F9EA; Test Examples</div>
          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, color: '#111827', display: 'grid', gap: 10 }}>
            <div>
              <strong>Deep Sleep:</strong><br/>
              GET /api/calmcast/render-wav?target=humans&mode=sleep&durationMinutes=5&format=mp3
            </div>
            <div>
              <strong>Dog Calming:</strong><br/>
              GET /api/calmcast/render-wav?target=dogs&mode=anxiety&durationMinutes=3&format=wav
            </div>
            <div>
              <strong>Focus Session:</strong><br/>
              GET /api/calmcast/render-wav?target=humans&mode=focus&durationMinutes=10&format=aac&quality=high
            </div>
            <div>
              <strong>Baby Soothing:</strong><br/>
              GET /api/calmcast/render-wav?target=babies&mode=sleep&durationMinutes=2&format=mp3
            </div>
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>&#x1F3B5; Audio Format Examples</div>
          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, color: '#111827', display: 'grid', gap: 10 }}>
            <div>GET /api/calmcast/render-wav?target=dogs&mode=storm&durationMinutes=1&format=mp3&quality=medium</div>
            <div>GET /api/calmcast/render-wav?target=cats&mode=sleep&durationMinutes=5&format=aac&stream=true</div>
            <div>GET /api/calmcast/render-wav?target=horses&mode=anxiety&durationMinutes=2&format=ogg&quality=high</div>
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>&#x1F510; Authentication</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><strong>Test API Key:</strong> <code>ck_test_1234567890abcdef</code> (100 requests/hour)</div>
            <div><strong>Production API Key:</strong> <code>ck_prod_abcdef1234567890</code> (1000 requests/hour)</div>
            <div><strong>Usage:</strong> Add to Authorization header as <code>Bearer YOUR_API_KEY</code> or as <code>?apiKey=YOUR_API_KEY</code></div>
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>&#x1F4D6; Response Headers</div>
          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, color: '#111827', display: 'grid', gap: 6 }}>
            <div>X-RateLimit-Remaining: Requests remaining in current window</div>
            <div>X-RateLimit-Reset: Unix timestamp when rate limit resets</div>
            <div>X-Audio-Format: Audio format of the response</div>
            <div>X-Cached: true/false if response was from cache</div>
            <div>X-Audio-Duration: Duration in minutes</div>
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>&#x26A1; Performance Improvements</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>&#x25CF; <strong>Caching:</strong> Identical requests served from Redis cache (2hr TTL)</div>
            <div>&#x25CF; <strong>Compression:</strong> MP3/AAC/OGG formats reduce bandwidth by 85-90%</div>
            <div>&#x25CF; <strong>Validation:</strong> Fast request validation prevents invalid processing</div>
            <div>&#x25CF; <strong>Logging:</strong> Structured logs for monitoring and debugging</div>
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>&#x1F4D1; Documentation</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>&#x25CF; <strong>PRESET_GUIDE.md</strong> - Complete scientific background and usage</div>
            <div>&#x25CF; <strong>README.md</strong> - API documentation and examples</div>
            <div>&#x25CF; <strong>Brainwave Science:</strong> Delta, Theta, Alpha, Beta, Gamma frequencies</div>
            <div>&#x25CF; <strong>Solfeggio Frequencies:</strong> 174Hz, 285Hz, 396Hz, 417Hz, 432Hz, 528Hz, 639Hz</div>
          </div>
        </div>
      </div>
    </main>
  );
}
