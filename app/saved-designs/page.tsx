"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileMenu from "@/components/profile-menu";
import SiteFooter from "@/components/site-footer";
import { useAuth } from "@/lib/hooks/useAuth";
import { getDesigns, deleteDesign } from "@/lib/api";
import bedroomImage from "@/images/bedroom.jpg";

// Supported room shapes persisted in saved design payload.
type RoomShape = "rectangle" | "square" | "lshape";

// Minimal furniture item schema stored in each saved design.
type StoredFurnitureItem = {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  length: number;
  height?: number;
  rotation: number;
  color: string;
};

// Design payload transferred between saved designs, 2D, and 3D pages.
type StoredDesignPayload = {
  name?: string;
  room: {
    width: number;
    length: number;
    height: number;
    shape: RoomShape;
    colorScheme: string;
    cutWidth?: number;
    cutLength?: number;
  };
  furniture: StoredFurnitureItem[];
};

// Card model rendered on this page.
type SavedDesignCard = {
  id: string;
  title: string;
  type: string;
  modifiedAt: string;
  payload: StoredDesignPayload;
};

// Toolbar sort modes.
type SortOption =
  | "modified-newest"
  | "modified-oldest"
  | "name-asc"
  | "name-desc";

// Parse-safe timestamp helper used in sorting.
function toTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Human readable date label for "Last modified".
function formatModifiedLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Seed payload for default/demo cards.
function createSamplePayload(colorScheme: string): StoredDesignPayload {
  return {
    room: {
      width: 5,
      length: 4,
      height: 2.8,
      shape: "rectangle",
      colorScheme,
    },
    furniture: [
      {
        id: "sample-chair-1",
        type: "chair",
        name: "Chair",
        x: 120,
        y: 100,
        width: 0.8,
        length: 0.8,
        height: 0.9,
        rotation: 0,
        color: "#8B6C56",
      },
    ],
  };
}

// Static fallback cards when there are no real saved designs.
// Return an empty list so the page only shows actual user-saved designs.
function getDefaultCards(): SavedDesignCard[] {
  return [];
}

// Converts unknown localStorage entries into normalized SavedDesignCard objects.
// Invalid entries return null and are filtered out.
function normalizeSavedEntry(raw: unknown, fallbackIndex: number): SavedDesignCard | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const roomRaw = entry.room as Record<string, unknown> | undefined;
  const furnitureRaw = Array.isArray(entry.furniture) ? entry.furniture : [];

  // Must have room data to build a valid design payload.
  if (!roomRaw) return null;

  // Normalize possible shape labels/casing.
  const shapeRaw = typeof roomRaw.shape === "string" ? roomRaw.shape.toLowerCase() : "rectangle";
  const shape: RoomShape =
    shapeRaw === "square" ? "square" : shapeRaw === "lshape" || shapeRaw === "l-shape" ? "lshape" : "rectangle";

  // Normalize room + furniture payload with safe defaults.
  const payload: StoredDesignPayload = {
    room: {
      width: typeof roomRaw.width === "number" ? roomRaw.width : 5,
      length: typeof roomRaw.length === "number" ? roomRaw.length : 4,
      height: typeof roomRaw.height === "number" ? roomRaw.height : 2.8,
      shape,
      colorScheme: typeof roomRaw.colorScheme === "string" ? roomRaw.colorScheme : "Light Neutral",
      cutWidth: typeof roomRaw.cutWidth === "number" ? roomRaw.cutWidth : undefined,
      cutLength: typeof roomRaw.cutLength === "number" ? roomRaw.cutLength : undefined,
    },
    furniture: furnitureRaw.reduce<StoredFurnitureItem[]>((acc, item, index) => {
      if (!item || typeof item !== "object") return acc;
      const x = item as Record<string, unknown>;
      acc.push({
        id: typeof x.id === "string" ? x.id : `item-${index}`,
        type: typeof x.type === "string" ? x.type : "chair",
        name: typeof x.name === "string" ? x.name : "Furniture",
        x: typeof x.x === "number" ? x.x : 0,
        y: typeof x.y === "number" ? x.y : 0,
        width: typeof x.width === "number" ? x.width : 1,
        length: typeof x.length === "number" ? x.length : 1,
        height: typeof x.height === "number" ? x.height : undefined,
        rotation: typeof x.rotation === "number" ? x.rotation : 0,
        color: typeof x.color === "string" ? x.color : "#8B6C56",
      });
      return acc;
    }, []),
  };

  // Normalize card-level metadata.
  return {
    id: typeof entry.id === "string" ? entry.id : `saved-${fallbackIndex}`,
    title:
      typeof entry.name === "string"
        ? entry.name
        : typeof entry.title === "string"
          ? entry.title
          : `Saved Design ${fallbackIndex + 1}`,
    type: typeof entry.type === "string" ? entry.type : "Custom Room",
    modifiedAt:
      typeof entry.modifiedAt === "string"
        ? entry.modifiedAt
        : typeof entry.modified === "string"
          ? entry.modified
          : new Date().toISOString(),
    payload,
  };
}

export default function SavedDesignsPage() {
  // --- Page state ---
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("modified-newest");
  const [designs, setDesigns] = useState<SavedDesignCard[]>(() => getDefaultCards());
  const [deleteTarget, setDeleteTarget] = useState<SavedDesignCard | null>(null);

  // Fetch user designs from backend when token becomes available.
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const result = await getDesigns(token);
        if (!result.error && result.data?.designs) {
          setDesigns(
            result.data.designs.map((d: any) => ({
              id: d._id,
              title: d.name,
              type: d.type || "Custom Room",
              modifiedAt: d.updatedAt || d.createdAt,
              payload: d.payload,
            }))
          );
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [token]);

  // Hydrate designs from localStorage once on mount (skip if user is authenticated and we already fetched from server).
  useEffect(() => {
    if (token) return; // use backend data when signed in
    try {
      const raw = window.localStorage.getItem("furnivision_saved_designs");
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const normalized = parsed
        .map((entry, index) => normalizeSavedEntry(entry, index))
        .filter((item): item is SavedDesignCard => item !== null);

      if (normalized.length > 0) setDesigns(normalized);
    } catch {
      // Ignore malformed localStorage data and keep defaults.
    }
  }, [token]);

  // Derived list: search filter + selected sort mode.
  const filteredAndSortedDesigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = designs.filter((design) => design.title.toLowerCase().includes(query));

    return [...filtered].sort((a, b) => {
      if (sortOption === "modified-newest") {
        return toTimestamp(b.modifiedAt) - toTimestamp(a.modifiedAt);
      }
      if (sortOption === "modified-oldest") {
        return toTimestamp(a.modifiedAt) - toTimestamp(b.modifiedAt);
      }
      if (sortOption === "name-asc") {
        return a.title.localeCompare(b.title);
      }
      return b.title.localeCompare(a.title);
    });
  }, [designs, searchQuery, sortOption]);

  // Open selected design in 2D editor route.
  const openDesignIn2D = (design: SavedDesignCard) => {
    const payloadWithName: StoredDesignPayload = {
      ...design.payload,
      name: design.title,
    };
    try {
      window.localStorage.setItem("furnivision_design", JSON.stringify(payloadWithName));
    } catch {
      // Continue navigation even if storage fails.
    }
    router.push(`/edit-2d?designId=${encodeURIComponent(design.id)}#design-2d-section`);
  };

  // Open selected design in 3D view route.
  const openDesignIn3D = (design: SavedDesignCard) => {
    const payloadWithName: StoredDesignPayload = {
      ...design.payload,
      name: design.title,
    };
    try {
      window.localStorage.setItem("furnivision_design", JSON.stringify(payloadWithName));
    } catch {
      // Continue navigation even if storage fails.
    }
    router.push(`/3d-design?designId=${encodeURIComponent(design.id)}`);
  };

  // Confirms deletion, removes card from state, and syncs localStorage.
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    // Optimistically remove from UI
    setDesigns((prev) => prev.filter((item) => item.id !== deleteTarget.id));

    // Try backend delete if we have a token and the id doesn't look like a default sample
    if (token && !deleteTarget.id.startsWith("default-")) {
      try {
        await deleteDesign(deleteTarget.id, token);
      } catch {
        // ignore failures
      }
    }

    // Also keep localStorage in sync
    try {
      const raw = window.localStorage.getItem("furnivision_saved_designs");
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const filtered = parsed.filter((entry) => {
        if (!entry || typeof entry !== "object") return true;
        const data = entry as Record<string, unknown>;
        return data.id !== deleteTarget.id;
      });
      window.localStorage.setItem("furnivision_saved_designs", JSON.stringify(filtered));
    } catch {
      // Ignore localStorage failures for delete sync.
    }

    setDeleteTarget(null);
  };

  return (
      // Page shell with layered blurred background.
      <main className="min-h-screen bg-[#f8f1e8] text-[#372414]">
      <div className="relative min-h-screen overflow-x-hidden bg-[#f8f1e8]">
        {/* Background image + gradient overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center blur-[0.5px]"
          style={{ backgroundImage: `url(${bedroomImage.src})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(252,248,243,0.94)_0%,rgba(243,231,218,0.9)_55%,rgba(234,216,200,0.88)_100%)]" />
        <div className="relative">
        <div className="w-full">
          {/* Sticky top navigation */}
          <header className="fixed inset-x-0 top-0 z-50 w-full overflow-visible rounded-none border border-[#e8e2da] border-x-0 border-t-0 bg-white/80 text-[#4d3525] shadow-[0_1px_6px_rgba(31,31,31,0.05)] backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#b7a087] bg-[#825a3c] text-sm font-semibold text-[#f7ebdf]">
                  FV
                </div>
                <p className="text-xl font-semibold [font-family:Inter,sans-serif]">FurniVision</p>
              </div>

              <nav className="order-3 flex w-full items-center justify-center gap-[50px] text-lg text-[#4d3525] md:order-none md:w-auto">
                <Link href="/dashboard" className="border-b-2 border-transparent pb-1 [font-family:Inter,sans-serif]">
                  Dashboard
                </Link>
                <Link href="/new-design" className="border-b-2 border-transparent pb-1 [font-family:Inter,sans-serif]">
                  New Design
                </Link>
                <Link
                  href="/saved-designs"
                  className="border-b-2 border-[#4d3525] pb-1 font-medium [font-family:Inter,sans-serif]"
                >
                  Saved Designs
                </Link>
              </nav>

              <ProfileMenu />
            </div>
          </header>
          {/* Spacer for fixed header height */}
          <div className="h-[78px]" />

          {/* Saved designs content area */}
          <section className="w-full border border-[#eadfd3] border-x-0 bg-transparent py-5 md:py-6">
            <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
              {/* Toolbar: search + sort + new design CTA */}
              <div className="mb-5 flex w-full flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by project name"
                    className="w-full rounded-full border border-[#cbb6a3] bg-[#fffdfa] px-4 py-2 text-sm text-[#4d3525] outline-none placeholder:text-[#9a8575] sm:w-[280px] md:w-[320px] focus:border-[#a88366]"
                  />
                  <select
                    value={sortOption}
                    onChange={(event) => setSortOption(event.target.value as SortOption)}
                    className="w-full rounded-full border border-[#cbb6a3] bg-[#fffdfa] px-3 py-2 text-sm text-[#4d3525] outline-none sm:w-[200px] focus:border-[#a88366]"
                  >
                    <option value="modified-newest">Last modified (Newest)</option>
                    <option value="modified-oldest">Last modified (Oldest)</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                  </select>
                </div>
                <Link
                  href="/new-design"
                  className="inline-flex items-center justify-center rounded-xl border border-[#6b4934] bg-[linear-gradient(135deg,#6a4b36_0%,#8b6448_100%)] px-4 py-2 text-sm font-medium text-[#fdf8f2] shadow-sm transition hover:opacity-95"
                >
                  + New Design
                </Link>
              </div>

              {/* Card list */}
              <div className="flex w-full flex-col gap-6 md:gap-7">
                {filteredAndSortedDesigns.map((design) => (
                  // Single saved design card
                  <article
                    key={design.id}
                    id={design.id}
                    className="scroll-mt-[98px] min-h-[140px] w-full overflow-hidden rounded-2xl border border-[#e6d6c8] bg-white/55 shadow-[0_10px_24px_rgba(31,31,31,0.08)] backdrop-blur-md"
                  >
                    <div className="p-4 md:p-5">
                      <h2 className="text-xl leading-tight text-[#3f2b1f] md:text-[22px]">{design.title}</h2>
                      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-1.5">
                          <p className="text-base text-[#5f4737]">{design.type}</p>
                          <p className="text-sm text-[#6f5848]">Last modified. {formatModifiedLabel(design.modifiedAt)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          {/* Card actions */}
                          <button
                            type="button"
                            onClick={() => openDesignIn2D(design)}
                            className="min-w-[145px] rounded-lg border border-[#b7a087] bg-white px-4 py-2 text-base text-[#4d3525] hover:bg-[#efe4d8]"
                          >
                            Edit in 2D
                          </button>
                          <button
                            type="button"
                            onClick={() => openDesignIn3D(design)}
                            className="min-w-[145px] rounded-lg border border-[#b7a087] bg-white px-4 py-2 text-base text-[#4d3525] hover:bg-[#efe4d8]"
                          >
                            View in 3D
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(design)}
                            className="min-w-[145px] rounded-lg border border-[#c95545] bg-white px-4 py-2 text-base text-[#9e3f32] hover:bg-[#fbeceb]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {/* Empty search/filter state */}
                {filteredAndSortedDesigns.length === 0 ? (
                  <div className="rounded-xl border border-[#d9c8ba] bg-[#fdf9f5] px-4 py-8 text-center text-base text-[#6b4e3a]">
                    No designs found.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* Global footer */}
          <SiteFooter className="mt-4 rounded-none border-x-0" />

          {/* Delete confirmation modal */}
          {deleteTarget ? (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1f140d]/45 p-4 backdrop-blur-[1px]">
              <div className="w-full max-w-md rounded-2xl border border-[#c7b4a5] bg-[#f7ebdf] p-5 shadow-2xl">
                <p className="text-lg font-medium text-[#3f2b1f]">Are you sure?</p>
                <p className="mt-2 text-sm text-[#6b4e3a]">
                  Delete &quot;{deleteTarget.title}&quot; from saved designs?
                </p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-lg border border-[#b7a087] bg-white px-4 py-1.5 text-sm text-[#4d3525] hover:bg-[#efe4d8]"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="rounded-lg border border-[#c95545] bg-white px-4 py-1.5 text-sm text-[#9e3f32] hover:bg-[#fbeceb]"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </main>
  );
}
