import { NextResponse } from "next/server";

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
    const photoFile = formData.get("photo") as File | null;
    if (photoFile && photoFile.size > 0) {
      const arrayBuffer = await photoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      const mimeType = photoFile.type || "image/jpeg";
      photoUrl = `data:${mimeType};base64,${base64}`;
    }

    const payload = {
      pet_name: body.petName.trim(),
      pet_type: petType,
      breed: body.breed.trim() || null,
      color: body.color.trim(),
      status: "lost",
      date_lost: body.lastSeen ? new Date(body.lastSeen).toISOString() : null,
      location_city: body.location.trim(),
      location_state: null,
      location_zip: null,
      location_detail: body.location.trim(),
      description: null,
      photo_url: photoUrl,
      owner_name: null,
      owner_email: body.email.trim() || null,
      owner_phone: body.phone.trim() || null,
    };

    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/lost_pets`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      return NextResponse.json({ error: "Failed to submit report", details }, { status: 500 });
    }

    const rows = (await res.json().catch(() => [])) as any[];
    const newPet = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    return NextResponse.json({ success: true, pet: newPet });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
