import { headers } from 'next/headers';
import PrintOnLoad from './PrintOnLoad';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeBaseUrl(raw: string | null | undefined): string | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  // Allow envs like "petreunion.org" or "https://petreunion.org"
  if (v.startsWith('http://') || v.startsWith('https://')) return v.replace(/\/+$/, '');
  return `https://${v}`.replace(/\/+$/, '');
}

function getApiBaseUrl(): string {
  // Always use the current request host for server-side data fetches
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3007';
  const proto = h.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

function getPublicBaseUrl(): string {
  // Prefer canonical public site URL so QR codes are shareable (not localhost)
  const fromEnv =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeBaseUrl(process.env.SITE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeBaseUrl(process.env.VERCEL_URL); // Vercel provides hostname without protocol
  if (fromEnv) return fromEnv;

  // Fallback: ALWAYS use production domain for QR codes (avoid localhost -> "unknown" when scanned)
  return 'https://petreunion.org';
}

function cleanDescription(desc: string | null | undefined): string {
  const s = (desc || '').trim();
  if (!s) return '';
  // Remove noisy continuous-search/debug bracket blocks
  return s.replace(/\[CONTINUOUS SEARCH:[^\]]+\]/gi, '').trim();
}

function formatDateForFlyer(input: any): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  // Stable formatting (avoid locale/timezone differences)
  return d.toISOString().slice(0, 10);
}

async function fetchPet(baseUrl: string, petId: string) {
  const res = await fetch(`${baseUrl}/api/petreunion/pet/${encodeURIComponent(petId)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({} as any));
  const pet = data?.pet;
  return { res, data, pet };
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const apiBaseUrl = getApiBaseUrl();
  const { pet } = await fetchPet(apiBaseUrl, params.id);
  const name = String(pet?.pet_name || pet?.name || 'Unknown');
  return {
    title: `Lost Pet Flyer - ${name}`,
    robots: { index: false, follow: false },
  };
}

export default async function FlyerPage({ params }: { params: { id: string } }) {
  const apiBaseUrl = getApiBaseUrl();
  const publicBaseUrl = getPublicBaseUrl();
  const petId = params.id;

  // Fetch pet from our API so we don't duplicate DB logic here.
  const { res, data, pet } = await fetchPet(apiBaseUrl, petId);

  // Back-compat: some deployments may return { pet: {...} } without success:true
  const ok = !!pet && (data?.success === true || typeof data?.success === 'undefined');
  if (!res.ok || !ok || !pet) {
    return (
      <div style={{ padding: 40, fontFamily: 'Arial, sans-serif' }}>
        <h1>Flyer unavailable</h1>
        <p>Pet not found.</p>
      </div>
    );
  }

  const name = String(pet.pet_name || pet.name || 'Unknown');
  const type = String(pet.pet_type || pet.type || '');
  const breed = String(pet.breed || '').trim();
  const color = String(pet.color || '').trim();
  const location = [pet.location_city, pet.location_state].filter(Boolean).join(', ');
  const dateLost = pet.date_lost || pet.date_found || pet.created_at;
  const dateLostText = formatDateForFlyer(dateLost);
  const description = cleanDescription(pet.description);

  // Public listing URL to scan
  const listingUrl = `${publicBaseUrl}/pets/${encodeURIComponent(petId)}`;
  const qrUrl = `/api/petreunion/qr?data=${encodeURIComponent(listingUrl)}`;

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
@page { size: letter; margin: 0.35in; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
body { font-family: Arial, sans-serif; }
.page { width: 100%; height: 10.3in; overflow: hidden; }
.header { text-align:center; padding: 10px 0 12px 0; border-bottom: 3px solid #667eea; }
.header h1 { margin:0; font-size: 46px; letter-spacing: 1px; color:#667eea; }
.header h2 { margin: 8px 0 0 0; font-size: 28px; color:#111; }
.grid { display:grid; grid-template-columns: 1.1fr 0.9fr; gap: 18px; margin-top: 16px; }
.photo { border: 3px solid #667eea; border-radius: 10px; overflow:hidden; height: 4.2in; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
.photo img { width:100%; height:100%; object-fit: cover; display:block; }
.details { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
.row { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.row:last-child{ border-bottom: none; }
.label { font-size: 11px; text-transform: uppercase; color:#667eea; font-weight: 700; margin-bottom: 3px; }
.value { font-size: 16px; color:#111; font-weight: 600; }
.desc { margin-top: 12px; border-radius: 10px; background:#f8fafc; padding: 12px; }
.desc h3 { margin:0 0 8px 0; color:#667eea; font-size: 16px; }
.desc p { margin:0; font-size: 13px; line-height: 1.25rem; max-height: 1.25rem * 6; overflow:hidden; }
.contact { margin-top: 12px; border-radius: 10px; border: 2px solid #f59e0b; background: #fffbeb; padding: 12px; text-align:center; }
.contact h3 { margin:0; color:#92400e; font-size: 18px; }
.contact p { margin: 6px 0 0 0; color:#111; font-size: 14px; font-weight:700; }
.qrWrap { margin-top: 10px; display:flex; gap: 12px; align-items:center; justify-content:center; }
.qrWrap img { width: 150px; height: 150px; border: 1px solid #e5e7eb; border-radius: 8px; }
.qrText { text-align:left; max-width: 260px; font-size: 12px; color:#334155; }
.footer { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align:center; color:#64748b; font-size: 11px; }
`,
        }}
      />

      <PrintOnLoad />

      <div className="page">
        <div className="header">
          <h1>LOST PET</h1>
          <h2>Please Help Us Find {name}</h2>
        </div>

        <div className="grid">
          <div>
            <div className="photo">
              {pet.photo_url ? <img src={pet.photo_url} alt={name} /> : <div style={{ fontSize: 54 }}>🐾</div>}
            </div>
            <div className="desc">
              <h3>Additional Information</h3>
              <p>{description || 'See online listing for additional details.'}</p>
            </div>
          </div>

          <div>
            <div className="details">
              <div className="row">
                <div className="label">Name</div>
                <div className="value">{name}</div>
              </div>
              <div className="row">
                <div className="label">Type</div>
                <div className="value">{type}</div>
              </div>
              {breed ? (
                <div className="row">
                  <div className="label">Breed</div>
                  <div className="value">{breed}</div>
                </div>
              ) : null}
              {color ? (
                <div className="row">
                  <div className="label">Color / Markings</div>
                  <div className="value">{color}</div>
                </div>
              ) : null}
              <div className="row">
                <div className="label">Last Seen</div>
                <div className="value">{location}</div>
              </div>
              {dateLostText ? (
                <div className="row">
                  <div className="label">Date Lost</div>
                  <div className="value">{dateLostText}</div>
                </div>
              ) : null}
            </div>

            <div className="contact">
              <h3>If Found, Please Contact:</h3>
              <p>See online listing for contact info</p>
              <div className="qrWrap">
                <img src={qrUrl} alt="QR code" />
                <div className="qrText">
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>QR Code (scan for details)</div>
                  <div style={{ wordBreak: 'break-word' }}>{listingUrl}</div>
                </div>
              </div>
            </div>

            <div className="footer">Reported on PetReunion.org • Scan QR to view full listing and contact info</div>
          </div>
        </div>
      </div>
    </div>
  );
}

