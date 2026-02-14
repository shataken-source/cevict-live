// Avatar equip API created by Cascade
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const authHeader = req.headers["x-user-id"] as string | undefined;
    if (!authHeader) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = authHeader;
    const { itemId } = req.body as { itemId?: string };

    if (!itemId) {
      return res.status(400).json({ error: "itemId is required" });
    }

    const { data, error } = await supabase
      .rpc("equip_avatar_item", { user_uuid: userId, item_uuid: itemId });

    if (error) {
      console.error("/api/avatar/equip error", error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("/api/avatar/equip error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
