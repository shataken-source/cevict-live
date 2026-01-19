// Avatar shop API created by Cascade
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const authHeader = req.headers["x-user-id"] as string | undefined;
    if (!authHeader) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = authHeader;

    const { data: items, error: shopError } = await supabase
      .rpc("get_shop_items", { user_uuid: userId });

    if (shopError) throw shopError;

    const { data: balanceData, error: balanceError } = await supabase
      .rpc("get_user_points", { user_uuid: userId });

    if (balanceError) throw balanceError;

    return res.status(200).json({
      items,
      pointsBalance: balanceData ?? 0,
    });
  } catch (error: any) {
    console.error("/api/avatar/shop error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
