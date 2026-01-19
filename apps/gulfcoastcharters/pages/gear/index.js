import { useMemo, useState } from "react";
import Layout from "../../components/Layout";
import { toast } from "sonner";
import { marineProducts } from "@/lib/marineProducts";

const CATEGORY_LABELS = {
  all: "All",
  safety: "Safety",
  navigation: "Navigation",
  fishing: "Fishing",
  accessories: "Accessories",
  electronics: "Electronics",
  maintenance: "Maintenance",
};

export default function GearPage({ session }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return marineProducts.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.description || "").toLowerCase().includes(q) ||
        String(p.retailer || "").toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Layout session={session}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Marine Gear</h1>
            <p className="text-gray-600">
              Curated essentials for safety, comfort, and better days on the water.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gear…"
              className="w-full sm:w-80 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6 text-sm text-gray-700">
          Some links may be affiliate links. If you purchase through them, it helps support the project
          at no extra cost.
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-700">
            <div className="font-semibold">No gear found</div>
            <div className="mt-1 text-sm text-gray-600">Try a different search or category.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-lg shadow p-6 border border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                      {p.featured ? (
                        <span className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded-full border border-yellow-200">
                          Featured
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-sm text-gray-700">
                      <span className="font-semibold">${Number(p.price).toFixed(2)}</span>
                      <span className="text-gray-400">•</span>
                      <span className="capitalize">{p.retailer}</span>
                      <span className="text-gray-400">•</span>
                      <span>
                        {p.rating.toFixed(1)} ★{" "}
                        <span className="text-gray-500">({p.reviewCount.toLocaleString()})</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <a
                    href={p.affiliateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  >
                    View deal
                  </a>
                  <button
                    type="button"
                    onClick={() => copyLink(p.affiliateLink)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Copy link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

