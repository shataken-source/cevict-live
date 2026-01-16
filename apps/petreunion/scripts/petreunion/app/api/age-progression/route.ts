import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const photo = formData.get("photo") as File;
  const years = formData.get("years") as string;
  const months = formData.get("months") as string; // Optional: months since loss

  // Validate required fields
  if (!photo || (!years && !months)) {
    return NextResponse.json(
      { error: "Photo and time period (years or months) are required" },
      { status: 400 }
    );
  }

  // Calculate total months
  const totalMonths = months
    ? parseInt(months)
    : (parseFloat(years || "0") * 12);

  if (totalMonths <= 0 || totalMonths > 240) {
    return NextResponse.json(
      { error: "Time period must be between 1 month and 20 years" },
      { status: 400 }
    );
  }

  // Validate API keys
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (!openaiKey) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured. Image generation requires OpenAI DALL-E API key.",
        message: "Please configure OPENAI_API_KEY in environment variables to enable age progression image generation."
      },
      { status: 500 }
    );
  }

  try {
    // Convert image to base64
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const imageDataUrl = `data:${photo.type};base64,${base64Image}`;

    // Step 1: Use Claude to analyze the pet and generate detailed aging description
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: photo.type,
                data: base64Image
              }
            },
            {
              type: "text",
              text: `Analyze this pet photo in detail. This pet has been missing for ${totalMonths} months (${(totalMonths / 12).toFixed(1)} years).

Provide a detailed description of how this animal would look NOW after ${totalMonths} months of aging. Be extremely specific about:

1. **Fur/Color Changes:**
   - Exact locations where gray/white fur would appear (muzzle, around eyes, chest, paws)
   - Any color fading or darkening
   - Texture changes (coarser, thinner)

2. **Facial Changes:**
   - Eye appearance (cloudiness, drooping)
   - Muzzle graying (exact pattern)
   - Whisker changes
   - Facial structure (sagging, weight changes)

3. **Body Changes:**
   - Weight gain or loss (where specifically)
   - Muscle tone changes
   - Posture changes
   - Skin/fur condition

4. **Breed-Specific Aging:**
   - How this specific breed typically ages
   - Unique aging markers for this breed

5. **Overall Appearance:**
   - Energy level visible in posture
   - Any distinguishing features that would remain
   - How the pet would look in a similar pose/lighting

Format your response as a detailed prompt for an AI image generator that will create an aged version of this exact pet. Be very specific about maintaining the pet's unique features while showing realistic aging.`
            }
          ]
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Claude API error: ${errorData.error?.message || claudeResponse.statusText}` },
        { status: 500 }
      );
    }

    const claudeData = await claudeResponse.json();
    const ageDescription = claudeData.content[0].text;

    // Step 2: Generate aged image using DALL-E 3
    // Note: DALL-E 3 doesn't support image-to-image, so we use the detailed description
    // For better results with image-to-image, consider using Replicate or Stability AI

    const imagePrompt = `A realistic, high-quality photograph of the exact same pet from the reference image, but aged ${totalMonths} months (${(totalMonths / 12).toFixed(1)} years) older.

${ageDescription}

Requirements:
- Must show the exact same pet with the same unique features and markings
- Realistic aging changes: graying fur, weight changes, facial changes
- Same pose and lighting style as the original photo
- High quality, photorealistic, professional photography
- Natural pet aging, not exaggerated`;

    const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt.substring(0, 4000), // DALL-E 3 has prompt length limits
        n: 1,
        size: "1024x1024",
        quality: "hd",
        response_format: "url"
      })
    });

    if (!dalleResponse.ok) {
      const errorData = await dalleResponse.json().catch(() => ({}));
      console.error("DALL-E error:", errorData);
      return NextResponse.json({
        success: false,
        description: ageDescription,
        progressedImage: null,
        originalImage: imageDataUrl,
        monthsAged: totalMonths,
        yearsAged: (totalMonths / 12).toFixed(1),
        error: `Image generation failed: ${errorData.error?.message || dalleResponse.statusText}`,
        message: "Age progression description generated, but image generation failed."
      });
    }

    const dalleData = await dalleResponse.json();
    const progressedImageUrl = dalleData.data[0].url;

    return NextResponse.json({
      success: true,
      description: ageDescription,
      progressedImage: progressedImageUrl,
      originalImage: imageDataUrl,
      monthsAged: totalMonths,
      yearsAged: (totalMonths / 12).toFixed(1),
      message: `Age progression generated successfully. Pet aged ${totalMonths} months.`
    });

  } catch (error: any) {
    console.error("Age progression error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate age progression",
        details: error?.stack
      },
      { status: 500 }
    );
  }
}
