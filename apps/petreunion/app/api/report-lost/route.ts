import { NextResponse } from "next/server";
import { validatePetPhotoInput } from "@/lib/photo-validation";
import { createLostPetReport } from "@/lib/lost-pet-report";
import { parseLocationInput } from "@/lib/location-parser";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

type LostPetForm = {
  petName: string;
  species: string;
  breed: string;
  color: string;
  lastSeen: string;
  location: string;
  phone: string;
  email: string;
};

function normalizePetType(species: string): "dog" | "cat" | null {
  const s = (species || "").toLowerCase().trim();
  if (s === "dog") return "dog";
  if (s === "cat") return "cat";
  return null;
}

export async function POST(req: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const body: LostPetForm = {
      petName: (formData.get("petName") as string) || "",
      species: (formData.get("species") as string) || "",
      breed: (formData.get("breed") as string) || "",
      color: (formData.get("color") as string) || "",
      lastSeen: (formData.get("lastSeen") as string) || "",
      location: (formData.get("location") as string) || "",
      phone: (formData.get("phone") as string) || "",
      email: (formData.get("email") as string) || "",
    };

    const petType = normalizePetType(body.species);
    if (!body.petName || !petType || !body.color || !body.lastSeen || !body.location || (!body.phone && !body.email)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Optional photo -> base64
    let photoUrl: string | null = null;
    let photoWarning: string | null = null;
    const photoFile = formData.get("photo") as File | null;
    if (photoFile && photoFile.size > 0) {
      const arrayBuffer = await photoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const validation = await validatePetPhotoInput({ photo_file: { buffer, mimeType: photoFile.type || "image/jpeg" } });
      if (!validation.ok) {
        if (validation.mode === "strict") {
          return NextResponse.json({ error: "Photo rejected", details: validation.reason, validation }, { status: 400 });
        }
        // soft mode: drop photo but accept report
        photoUrl = null;
        photoWarning = `Photo not saved: ${validation.reason}`;
      } else {
      const base64 = buffer.toString("base64");
      const mimeType = photoFile.type || "image/jpeg";
      photoUrl = `data:${mimeType};base64,${base64}`;
      }
    }

    const payload = {
      pet_name: body.petName.trim(),
      pet_type: petType,
      breed: body.breed.trim() || null,
      color: body.color.trim(),
      status: "lost",
      date_lost: body.lastSeen ? new Date(body.lastSeen).toISOString() : null,
      // Best-effort: try to split City/State/ZIP out of a single input.
      // We still keep the raw string in location_detail for safety.
      ...(() => {
        const parsed = parseLocationInput(body.location.trim());
        return {
          location_city: parsed.city || body.location.trim(),
          location_state: parsed.state,
          location_zip: parsed.zip,
          location_detail: parsed.detail || body.location.trim(),
        };
      })(),
      description: null,
      photo_url: photoUrl,
      owner_name: null,
      owner_email: body.email.trim() || null,
      owner_phone: body.phone.trim() || null,
    };

    // Use shared helper to keep behavior consistent with /api/petreunion/report-lost
    const result = await createLostPetReport({ supabaseUrl, supabaseKey, body: payload as any });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, ...(result.details ? { details: result.details } : {}) }, { status: result.status });
    }

    const warning = photoWarning || (result.ok ? result.photoWarning : null);
    return NextResponse.json({ success: true, pet: result.pet, ...(warning ? { photoWarning: warning } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
