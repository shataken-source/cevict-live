import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MODEL = "gpt-image-embedding-1";
const TARGET_DIM = 512; // matches pet_embeddings schema

async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const photo = formData.get("photo") as File | null;
    const threshold = parseFloat((formData.get("threshold") as string) || "0.7");
    const limit = parseInt((formData.get("limit") as string) || "10", 10);
    const excludePetId = (formData.get("exclude_pet_id") as string) || null;

    if (!photo) {
      return NextResponse.json({ error: "Photo is required" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase service credentials missing" },
        { status: 500 }
      );
    }

    const base64 = await fileToBase64(photo);
    const dataUrl = `data:${photo.type || "image/jpeg"};base64,${base64}`;

    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{ image: dataUrl }],
      }),
    });

    if (!embedRes.ok) {
      const errText = await embedRes.text();
      return NextResponse.json(
        {
          error: "Failed to generate embedding",
          details: errText,
        },
        { status: 502 }
      );
    }

    const embedJson = (await embedRes.json()) as any;
    const embedding: number[] = embedJson?.data?.[0]?.embedding || [];
    if (!embedding.length) {
      return NextResponse.json(
        { error: "Embedding not returned by provider" },
        { status: 502 }
      );
    }

    // Downsample to match 512-dim schema if provider returns larger vectors
    const trimmedEmbedding =
      embedding.length > TARGET_DIM
        ? embedding.slice(0, TARGET_DIM)
        : embedding;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.rpc("find_similar_pets", {
      query_embedding: trimmedEmbedding,
      similarity_threshold: threshold,
      limit_count: limit,
      exclude_pet_id: excludePetId,
    });

    if (error) {
      return NextResponse.json(
        { error: "Similarity search failed", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matches: data || [],
      embedding_dims: trimmedEmbedding.length,
      model: MODEL,
    });
  } catch (error: any) {
    console.error("[photo-match] failed:", error?.message || error);
    return NextResponse.json(
      { error: "Failed to process photo", details: error?.message },
      { status: 500 }
    );
  }
}