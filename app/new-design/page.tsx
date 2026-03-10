"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ProfileMenu from "@/components/profile-menu";
import SiteFooter from "@/components/site-footer";
import bedroomImage from "@/images/bedroom.jpg";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/hooks/useAuth";
import { createDesign, updateDesign, getDesignById } from "@/lib/api";

// --- Core domain types used by 2D editor and localStorage payloads ---
type FurnitureType = "sofa" | "table" | "chair" | "cupboard" | "lamp" | "bed" | "storage" | "other";

type RoomShape = "rectangle" | "square" | "lshape";
type TableShape = "round" | "rectangle";
type ColorScheme = {
  name: string;
  colors: string[];
  description: string;
  bestFor: string;
};

type LibraryItem = {
  type: FurnitureType;
  label: string;
  defaultWidth: number;
  defaultLength: number;
  defaultColor: string;
  imageSrc?: string;
  supportsSeats?: boolean;
  defaultSeats?: number;
};

type PlacedFurniture = {
  id: string;
  type: FurnitureType;
  label: string;
  x: number;
  y: number;
  width: number;
  length: number;
  height?: number;
  rotation: number;
  color: string;
  seats?: number;
  imageSrc?: string;
};

type StoredDesignPayload = {
  name?: string;
  room?: {
    width?: number;
    length?: number;
    height?: number;
    shape?: RoomShape | "Rectangle" | "Square" | "L-Shape";
    colorScheme?: string;
    cutWidth?: number;
    cutLength?: number;
  };
  furniture?: Array<{
    id?: string;
    type?: string;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    length?: number;
    height?: number;
    rotation?: number;
    color?: string;
  }>;
};

// Preset room color schemes used in both setup section and right-side details panel.
const colorSchemes: ColorScheme[] = [
  {
    name: "Light Neutral",
    colors: ["#f4eee7", "#e8dfd5", "#d8c8b8", "#c3ad99"],
    description: "Soft neutral tones with warm whites for clean, bright spaces.",
    bestFor: "Minimal living rooms and modern apartments.",
  },
  {
    name: "Warm Beige",
    colors: ["#efdfcd", "#ddc6ab", "#cda988", "#b98d69"],
    description: "Comfortable warm-beige palette with cozy natural depth.",
    bestFor: "Bedrooms and family spaces.",
  },
  {
    name: "Cool Gray",
    colors: ["#ecebeb", "#d8d7d5", "#c3c1bd", "#9f9c96"],
    description: "Balanced gray palette with modern, calm character.",
    bestFor: "Office and contemporary interiors.",
  },
  {
    name: "Earthy Green",
    colors: ["#e4e7de", "#cfd6c3", "#a8b297", "#7f8d6d"],
    description: "Nature-inspired greens with muted organic tones.",
    bestFor: "Relaxing spaces and eco-inspired rooms.",
  },
  {
    name: "Soft Blue",
    colors: ["#e7edf5", "#ccd9ea", "#a6b9d5", "#7f98be"],
    description: "Light-to-mid blues for an airy and peaceful atmosphere.",
    bestFor: "Guest rooms and focused work areas.",
  },
];

// Quick furniture color chips shown in furniture details.
const furnitureColorSwatches = [
  "#FFFFFF",
  "#E8DCCB",
  "#C9B79C",
  "#8B6C56",
  "#6B4A35",
  "#2F3A4A",
  "#89A3B2",
  "#7D8F69",
  "#C76D5E",
  "#000000",
];

// Base furniture library shown in left panel.
const initialLibraryItems: LibraryItem[] = [
  {
    type: "sofa",
    label: "Sofa",
    defaultWidth: 2,
    defaultLength: 0.9,
    defaultColor: "#ffffff",
    imageSrc: "/furniture/sofa-2-seat.svg",
    supportsSeats: true,
    defaultSeats: 2,
  },
  { type: "table", label: "Table", defaultWidth: 1.6, defaultLength: 0.9, defaultColor: "#ffffff" },
  {
    type: "chair",
    label: "Chair",
    defaultWidth: 0.8,
    defaultLength: 0.8,
    defaultColor: "#ffffff",
    imageSrc: "/furniture/chair.svg",
  },
  {
    type: "cupboard",
    label: "Cupboard",
    defaultWidth: 1.2,
    defaultLength: 0.6,
    defaultColor: "#ffffff",
    imageSrc: "/furniture/cupboard.svg",
  },
  { type: "lamp", label: "Lamp", defaultWidth: 0.45, defaultLength: 0.45, defaultColor: "#ffffff", imageSrc: "/furniture/lamp.svg" },
  {
    type: "bed",
    label: "Bed",
    defaultWidth: 2,
    defaultLength: 1.6,
    defaultColor: "#ffffff",
  },
];

// Generic fallback icon for custom furniture items.
const genericFurnitureIcon =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect x="10" y="14" width="100" height="52" rx="8" fill="#efe4d8" stroke="#6b4a35" stroke-width="4"/><line x1="20" y1="40" x2="100" y2="40" stroke="#6b4a35" stroke-width="3"/></svg>`,
  );

// Shared conversion scale between meters and rendered pixels in 2D.
const pxPerMeter = 100;

// Generic clamp helper.
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Sofa sizing rules by seat count.
function getSofaWidthBySeats(seats: number) {
  return Number((0.7 * seats + 0.6).toFixed(1));
}

// Sofa top-view icon selection by seat count.
function getSofaImageBySeats(seats: number) {
  if (seats <= 1) return "/furniture/sofa-1-seat.svg";
  if (seats === 2) return "/furniture/sofa-2-seat.svg";
  return "/furniture/sofa-3-seat.svg";
}

// Table config by selected table shape (kept in library controls).
function getTableConfigByShape(shape: TableShape) {
  if (shape === "round") {
    return { width: 1.1, length: 1.1, label: "Round Table", imageSrc: "/furniture/table-round.svg" };
  }
  return { width: 1.6, length: 0.9, label: "Rectangle Table", imageSrc: "/furniture/table-rectangle.svg" };
}

// Convert hex color into rgba() string for canvas tinting.
function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return `rgba(0,0,0,${alpha})`;
  const value = Number.parseInt(cleaned, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Normalize unknown input type values into supported FurnitureType.
function normalizeFurnitureType(value: string | undefined): FurnitureType {
  const normalized = (value || "").toLowerCase();
  if (
    normalized === "sofa" ||
    normalized === "table" ||
    normalized === "chair" ||
    normalized === "cupboard" ||
    normalized === "lamp" ||
    normalized === "bed" ||
    normalized === "storage" ||
    normalized === "other"
  ) {
    return normalized;
  }
  return "other";
}

// Normalize room shape labels coming from different routes/saved payloads.
function normalizeRoomShape(
  value: RoomShape | "Rectangle" | "Square" | "L-Shape" | string | undefined,
): RoomShape {
  const normalized = (value || "").toLowerCase();
  if (normalized === "square") return "square";
  if (normalized === "l-shape" || normalized === "lshape") return "lshape";
  return "rectangle";
}

// L-shape cutout is derived as 40% x 40% of room size.
function getLShapeCutSizes(width: number, length: number) {
  return { cutWidth: width * 0.4, cutLength: length * 0.4 };
}

export default function NewDesignPage() {
  // --- Routing context ---
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEditorOnlyPage = pathname === "/edit-2d";
  const sourceDesignId = searchParams.get("designId");
  const backToSavedHref = "/saved-designs";

  // --- Room-level state ---
  const [roomWidth, setRoomWidth] = useState(5);
  const [roomLength, setRoomLength] = useState(4);
  const [roomHeight, setRoomHeight] = useState(2.8);
  const [roomWidthInput, setRoomWidthInput] = useState("5");
  const [roomLengthInput, setRoomLengthInput] = useState("4");
  const [roomHeightInput, setRoomHeightInput] = useState("2.8");
  const [rangeErrorMessage, setRangeErrorMessage] = useState<string | null>(null);
  const [roomShape, setRoomShape] = useState<RoomShape>("rectangle");
  const [selectedSchemeName, setSelectedSchemeName] = useState(colorSchemes[0].name);

  // --- Furniture/editor state ---
  const [furniture, setFurniture] = useState<PlacedFurniture[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(initialLibraryItems);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [librarySofaSeats, setLibrarySofaSeats] = useState(2);
  const [libraryTableShape, setLibraryTableShape] = useState<TableShape>("rectangle");
  const [zoom, setZoom] = useState(1);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [isColorInfoOpen, setIsColorInfoOpen] = useState(false);
  const [colorInfoSchemeName, setColorInfoSchemeName] = useState<string | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<"room" | "furniture">("room");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredFurnitureId, setHoveredFurnitureId] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // --- Add custom furniture modal state ---
  const [isAddFurnitureModalOpen, setIsAddFurnitureModalOpen] = useState(false);
  const [newFurnitureName, setNewFurnitureName] = useState("");
  const [newFurnitureType, setNewFurnitureType] = useState<FurnitureType>("other");
  const [newFurnitureWidth, setNewFurnitureWidth] = useState(1.5);
  const [newFurnitureLength, setNewFurnitureLength] = useState(1);
  const [newFurnitureIconMode, setNewFurnitureIconMode] = useState<"generic" | "none">("generic");

  // --- Search/save UI state ---
  const [librarySearch, setLibrarySearch] = useState("");
  const { token } = useAuth();
  const [saveDesignName, setSaveDesignName] = useState("");
  const [saveDesignMessage, setSaveDesignMessage] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const roomRef = useRef<HTMLDivElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const idCounter = useRef(0);

  // Active color scheme + info modal currently viewed scheme.
  const selectedScheme =
    colorSchemes.find((scheme) => scheme.name === selectedSchemeName) ?? colorSchemes[0];
  const colorInfoScheme =
    colorSchemes.find((scheme) => scheme.name === colorInfoSchemeName) ?? selectedScheme;

  // Meter <-> pixel helpers for consistent geometry math.
  const metersToPixels = (meters: number) => meters * pxPerMeter;
  const pixelsToMeters = (pixels: number) => pixels / pxPerMeter;

  // Derived room dimensions in pixels (used by canvas drawing/hit-tests).
  const roomPixelWidth = metersToPixels(roomWidth);
  const roomPixelLength = metersToPixels(roomLength);
  const roomCutWidth = roomWidth * 0.4;
  const roomCutLength = roomLength * 0.4;
  const roomCutWidthPx = roomPixelWidth * 0.4;
  const roomCutLengthPx = roomPixelLength * 0.4;

  // Constrain furniture position to valid room area (supports L-shape cut-out).
  const keepFurnitureInRoom = (
    xPx: number,
    yPx: number,
    widthPx: number,
    lengthPx: number,
    shape: RoomShape = roomShape,
  ) => {
    const maxX = Math.max(0, roomPixelWidth - widthPx);
    const maxY = Math.max(0, roomPixelLength - lengthPx);
    let nextX = clamp(xPx, 0, maxX);
    let nextY = clamp(yPx, 0, maxY);

    if (shape !== "lshape") {
      return { x: nextX, y: nextY };
    }

    const cutStartX = roomPixelWidth - roomCutWidthPx;
    const cutEndY = roomCutLengthPx;
    let centerX = nextX + widthPx / 2;
    let centerY = nextY + lengthPx / 2;

    if (centerX > cutStartX && centerY < cutEndY) {
      const moveX = Math.abs(centerX - cutStartX);
      const moveY = Math.abs(cutEndY - centerY);
      if (moveX <= moveY) {
        centerX = cutStartX;
      } else {
        centerY = cutEndY;
      }
      nextX = clamp(centerX - widthPx / 2, 0, maxX);
      nextY = clamp(centerY - lengthPx / 2, 0, maxY);
    }

    return { x: nextX, y: nextY };
  };

  const selectedFurniture = useMemo(
    () => furniture.find((item) => item.id === selectedFurnitureId) ?? null,
    [furniture, selectedFurnitureId],
  );
  const filteredLibraryItems = useMemo(
    () =>
      libraryItems.filter((item) =>
        item.label.toLowerCase().includes(librarySearch.trim().toLowerCase()),
      ),
    [libraryItems, librarySearch],
  );
  const selectedColor = selectedFurniture?.color ?? "#8B6C56";

  // Restore last working design snapshot for seamless 2D/3D round-trip editing.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // helper that applies a payload to all of the local state setters
    const restoreFromPayload = (parsed: StoredDesignPayload) => {
      if (parsed?.room) {
        const roomData = parsed.room;
        if (typeof roomData.width === "number") {
          const next = clamp(roomData.width, 2, 10);
          setRoomWidth(next);
          setRoomWidthInput(String(next));
        }
        if (typeof roomData.length === "number") {
          const next = clamp(roomData.length, 2, 10);
          setRoomLength(next);
          setRoomLengthInput(String(next));
        }
        if (typeof roomData.height === "number") {
          const next = clamp(roomData.height, 2.2, 5);
          setRoomHeight(next);
          setRoomHeightInput(String(next));
        }
        setRoomShape(normalizeRoomShape(roomData.shape));
        if (
          typeof roomData.colorScheme === "string" &&
          colorSchemes.some((scheme) => scheme.name === roomData.colorScheme)
        ) {
          setSelectedSchemeName(roomData.colorScheme);
        }
      }

      if (typeof parsed?.name === "string" && parsed.name.trim()) {
        setSaveDesignName(parsed.name);
      }

      if (Array.isArray(parsed.furniture)) {
        const restoredFurniture: PlacedFurniture[] = parsed.furniture
          .filter((item) => typeof item.x === "number" && typeof item.y === "number")
          .map((item, index) => ({
            id: item.id || `restored-${index}`,
            type: normalizeFurnitureType(item.type),
            label: item.name || "Furniture",
            x: item.x ?? 0,
            y: item.y ?? 0,
            width: clamp(item.width ?? 1, 0.3, 10),
            length: clamp(item.length ?? 1, 0.3, 10),
            height:
              normalizeFurnitureType(item.type) === "cupboard"
                ? clamp(item.height ?? 2, 0.8, 3.5)
                : normalizeFurnitureType(item.type) === "lamp"
                  ? clamp(item.height ?? 1.5, 0.5, 3)
                  : item.height,
            rotation: item.rotation ?? 0,
            color: item.color || "#8B6C56",
          }));

        setFurniture(restoredFurniture);
        idCounter.current = restoredFurniture.length;
      }
    };

    (async () => {
      if (sourceDesignId && token) {
        try {
          const res = await getDesignById(sourceDesignId, token);
          if (!res.error && res.data?.design) {
            restoreFromPayload(res.data.design.payload as StoredDesignPayload);
            return;
          }
        } catch {
          // fall back to localStorage if network fails
        }
      }

      try {
        const raw = window.localStorage.getItem("furnivision_design");
        if (!raw) return;
        const parsed = JSON.parse(raw) as StoredDesignPayload;
        restoreFromPayload(parsed);
      } catch {
        // Ignore malformed localStorage.
      }
    })();
  }, [sourceDesignId, token]);
  const getUnscaledRoomPoint = (clientX: number, clientY: number) => {
    if (!roomRef.current) return null;
    const rect = roomRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  // Room shape changes also enforce square sync logic.
  const handleRoomShapeChange = (nextShape: RoomShape) => {
    const normalized = normalizeRoomShape(nextShape);
    setRoomShape(normalized);
    if (normalized === "square") {
      const synced = clamp(roomLength, 2, 10);
      setRoomWidth(synced);
      setRoomLength(synced);
      setRoomWidthInput(String(synced));
      setRoomLengthInput(String(synced));
    }
  };

  // Width input handler (live typing + square sync).
  const handleRoomWidthChange = (raw: string) => {
    setRoomWidthInput(raw);
    if (raw.trim() === "") return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    if (parsed >= 2 && parsed <= 10) {
      if (roomShape === "square") {
        setRoomWidth(parsed);
        setRoomLength(parsed);
        setRoomLengthInput(raw);
      } else {
        setRoomWidth(parsed);
      }
    }
  };

  // Length input handler (live typing + square sync).
  const handleRoomLengthChange = (raw: string) => {
    setRoomLengthInput(raw);
    if (raw.trim() === "") return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    if (parsed >= 2 && parsed <= 10) {
      if (roomShape === "square") {
        setRoomLength(parsed);
        setRoomWidth(parsed);
        setRoomWidthInput(raw);
      } else {
        setRoomLength(parsed);
      }
    }
  };

  // Auto-fit room canvas into center panel viewport.
  const fitCanvasToViewport = () => {
    if (!canvasViewportRef.current) return;
    const viewportWidth = canvasViewportRef.current.clientWidth;
    const viewportHeight = canvasViewportRef.current.clientHeight;
    if (!viewportWidth || !viewportHeight) return;

    const wrapperExtraWidth = 64; // label space + room border allowance
    const wrapperExtraHeight = 56; // label space + room border allowance
    const fitAreaRatio = 0.74;
    const targetWidth = Math.max(1, (viewportWidth - 16) * fitAreaRatio);
    const targetHeight = Math.max(1, (viewportHeight - 16) * fitAreaRatio);

    let nextZoom = Math.min(
      (targetWidth - wrapperExtraWidth) / roomPixelWidth,
      (targetHeight - wrapperExtraHeight) / roomPixelLength,
      1,
    );
    nextZoom = clamp(Number(nextZoom.toFixed(2)), 0.3, 2);

    // Final tighten loop so rendered wrapper always fits without manual tweaking.
    while (
      nextZoom > 0.3 &&
      (roomPixelWidth * nextZoom + wrapperExtraWidth > targetWidth ||
        roomPixelLength * nextZoom + wrapperExtraHeight > targetHeight)
    ) {
      nextZoom = clamp(Number((nextZoom - 0.01).toFixed(2)), 0.3, 2);
    }

    setZoom((prev) => (prev > nextZoom ? nextZoom : prev));
  };

  // Height input handler.
  const handleRoomHeightChange = (raw: string) => {
    setRoomHeightInput(raw);
    if (raw.trim() === "") return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setRoomHeight(clamp(parsed, 2.2, 5));
  };

  // Width validation commit on blur.
  const commitRoomWidth = () => {
    const parsed = Number(roomWidthInput);
    if (roomWidthInput.trim() === "" || !Number.isFinite(parsed)) {
      setRoomWidthInput(String(roomWidth));
      return;
    }
    if (parsed < 2 || parsed > 10) {
      setRangeErrorMessage("Width must be between 2m and 10m.");
      setRoomWidthInput(String(roomWidth));
      return;
    }
    if (roomShape === "square") {
      setRoomWidth(parsed);
      setRoomLength(parsed);
      setRoomWidthInput(String(parsed));
      setRoomLengthInput(String(parsed));
      return;
    }
    setRoomWidth(parsed);
    setRoomWidthInput(String(parsed));
  };

  // Length validation commit on blur.
  const commitRoomLength = () => {
    const parsed = Number(roomLengthInput);
    if (roomLengthInput.trim() === "" || !Number.isFinite(parsed)) {
      setRoomLengthInput(String(roomLength));
      return;
    }
    if (parsed < 2 || parsed > 10) {
      setRangeErrorMessage("Length must be between 2m and 10m.");
      setRoomLengthInput(String(roomLength));
      return;
    }
    if (roomShape === "square") {
      setRoomLength(parsed);
      setRoomWidth(parsed);
      setRoomLengthInput(String(parsed));
      setRoomWidthInput(String(parsed));
      return;
    }
    setRoomLength(parsed);
    setRoomLengthInput(String(parsed));
  };

  // Height validation commit on blur.
  const commitRoomHeight = () => {
    const parsed = Number(roomHeightInput);
    if (roomHeightInput.trim() === "" || !Number.isFinite(parsed)) {
      setRoomHeightInput(String(roomHeight));
      return;
    }
    const clamped = clamp(parsed, 2.2, 5);
    setRoomHeight(clamped);
    setRoomHeightInput(String(clamped));
  };

  // Select library preview icon based on current sofa/table configuration.
  const getLibraryPreviewSrc = (item: LibraryItem) => {
    if (item.type === "sofa") return getSofaImageBySeats(librarySofaSeats);
    if (item.type === "table") return getTableConfigByShape(libraryTableShape).imageSrc;
    return item.imageSrc || genericFurnitureIcon;
  };

  // Adds a custom furniture definition to the left library list.
  const addCustomFurnitureItem = () => {
    const trimmedName = newFurnitureName.trim();
    if (!trimmedName) return;
    const next: LibraryItem = {
      type: newFurnitureType,
      label: trimmedName,
      defaultWidth: clamp(newFurnitureWidth, 0.3, 6),
      defaultLength: clamp(newFurnitureLength, 0.3, 6),
      defaultColor: "#ffffff",
      imageSrc: newFurnitureIconMode === "generic" ? genericFurnitureIcon : undefined,
    };
    setLibraryItems((prev) => [...prev, next]);
    setIsAddFurnitureModalOpen(false);
    setNewFurnitureName("");
    setNewFurnitureType("other");
    setNewFurnitureWidth(1.5);
    setNewFurnitureLength(1);
    setNewFurnitureIconMode("generic");
  };

  // Recalculate canvas fit on resize/fullscreen or room dimension change.
  useEffect(() => {
    fitCanvasToViewport();
    const onResize = () => fitCanvasToViewport();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [roomPixelWidth, roomPixelLength, isCanvasFullscreen]);

  // Keep existing furniture inside bounds when room size/shape changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setFurniture((prev) =>
      prev.map((item) => {
        const widthPx = metersToPixels(item.width);
        const lengthPx = metersToPixels(item.length);
        const validPos = keepFurnitureInRoom(item.x, item.y, widthPx, lengthPx);
        if (validPos.x === item.x && validPos.y === item.y) return item;
        return { ...item, x: validPos.x, y: validPos.y };
      }),
    );
  }, [roomShape, roomPixelWidth, roomPixelLength]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Add furniture item into room with resolved variants (sofa seats/table shape).
  const addFurniture = (
    item: LibraryItem,
    xPx: number,
    yPx: number,
    seatsOverride?: number,
    tableShapeOverride?: TableShape,
  ) => {
    const resolvedSeats =
      item.type === "sofa" ? clamp(seatsOverride ?? item.defaultSeats ?? 2, 1, 3) : undefined;
    const resolvedTableShape =
      item.type === "table" ? (tableShapeOverride ?? libraryTableShape) : undefined;
    const resolvedTableConfig =
      item.type === "table" && resolvedTableShape ? getTableConfigByShape(resolvedTableShape) : null;
    const resolvedWidth =
      item.type === "sofa" && resolvedSeats
        ? getSofaWidthBySeats(resolvedSeats)
        : resolvedTableConfig
          ? resolvedTableConfig.width
          : item.defaultWidth;
    const resolvedLength = resolvedTableConfig ? resolvedTableConfig.length : item.defaultLength;
    const resolvedLabel =
      item.type === "sofa" && resolvedSeats
        ? `${resolvedSeats}-Seat Sofa`
        : resolvedTableConfig
          ? resolvedTableConfig.label
          : item.label;
    const resolvedImageSrc =
      item.type === "sofa" && resolvedSeats
        ? getSofaImageBySeats(resolvedSeats)
        : resolvedTableConfig
          ? resolvedTableConfig.imageSrc
          : item.imageSrc;
    const widthPx = metersToPixels(resolvedWidth);
    const lengthPx = metersToPixels(resolvedLength);
    const validPos = keepFurnitureInRoom(xPx, yPx, widthPx, lengthPx);
    const next: PlacedFurniture = {
      id: `item-${idCounter.current++}`,
      type: item.type,
      label: resolvedLabel,
      x: validPos.x,
      y: validPos.y,
      width: resolvedWidth,
      length: resolvedLength,
      height: item.type === "cupboard" ? 2 : item.type === "lamp" ? 1.5 : undefined,
      rotation: 0,
      color: item.defaultColor,
      seats: item.supportsSeats ? resolvedSeats : undefined,
      imageSrc: resolvedImageSrc,
    };

    setFurniture((prev) => [...prev, next]);
    setSelectedFurnitureId(next.id);
    setActiveDetailsTab("furniture");
  };

  // Start dragging from furniture library card.
  const onLibraryDragStart = (event: React.DragEvent<HTMLElement>, item: LibraryItem) => {
    event.dataTransfer.setData("application/furniture-type", item.type);
    if (item.type === "sofa") {
      event.dataTransfer.setData("application/furniture-seats", String(librarySofaSeats));
    }
    if (item.type === "table") {
      event.dataTransfer.setData("application/furniture-table-shape", libraryTableShape);
    }
    // Hide the browser's default drag ghost preview to avoid duplicate overlay cards.
    const transparentPixel = new window.Image();
    transparentPixel.src =
      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    event.dataTransfer.setDragImage(transparentPixel, 0, 0);
    event.dataTransfer.effectAllowed = "copy";
  };

  // Drop handler: resolves dropped furniture type and inserts at pointer position.
  const onRoomDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!roomRef.current) return;

    const type = event.dataTransfer.getData("application/furniture-type") as FurnitureType;
    const seatsData = event.dataTransfer.getData("application/furniture-seats");
    const tableShapeData = event.dataTransfer.getData("application/furniture-table-shape") as TableShape;
    const sofaSeats = Number(seatsData);
    const item = libraryItems.find((entry) => entry.type === type);
    if (!item) return;

    const dropPoint = getUnscaledRoomPoint(event.clientX, event.clientY);
    if (!dropPoint) return;
    const dropX = dropPoint.x;
    const dropY = dropPoint.y;
    const draftWidth =
      item.type === "sofa"
        ? getSofaWidthBySeats(clamp(Number.isFinite(sofaSeats) ? sofaSeats : librarySofaSeats, 1, 3))
        : item.type === "table"
          ? getTableConfigByShape(tableShapeData || libraryTableShape).width
        : item.defaultWidth;
    const draftLength =
      item.type === "table" ? getTableConfigByShape(tableShapeData || libraryTableShape).length : item.defaultLength;
    const newItem = {
      imageSrc:
        item.type === "sofa"
          ? getSofaImageBySeats(clamp(Number.isFinite(sofaSeats) ? sofaSeats : librarySofaSeats, 1, 3))
          : item.type === "table"
            ? getTableConfigByShape(tableShapeData || libraryTableShape).imageSrc
            : item.imageSrc,
    };
    console.log("Dropped item imageSrc:", newItem.imageSrc);
    addFurniture(
      item,
      dropX - metersToPixels(draftWidth) / 2,
      dropY - metersToPixels(draftLength) / 2,
      item.type === "sofa" ? clamp(Number.isFinite(sofaSeats) ? sofaSeats : librarySofaSeats, 1, 3) : undefined,
      item.type === "table" ? (tableShapeData || libraryTableShape) : undefined,
    );
  };

  // Pointer move on room/canvas:
  // 1) update hover tooltip target
  // 2) move dragged item (if dragging).
  const onRoomPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const pointer = getUnscaledRoomPoint(event.clientX, event.clientY);
    if (!pointer) return;
    const pointerX = metersToPixels(pixelsToMeters(pointer.x));
    const pointerY = metersToPixels(pixelsToMeters(pointer.y));

    const hoverHit = [...furniture]
      .reverse()
      .find((item) => {
        const wPx = metersToPixels(item.width);
        const hPx = metersToPixels(item.length);
        const cx = item.x + wPx / 2;
        const cy = item.y + hPx / 2;
        const angle = -((item.rotation ?? 0) * Math.PI) / 180;
        const dx = pointerX - cx;
        const dy = pointerY - cy;
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle) + cx;
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle) + cy;
        return (
          localX >= item.x &&
          localX <= item.x + wPx &&
          localY >= item.y &&
          localY <= item.y + hPx
        );
      });

    setHoveredFurnitureId(hoverHit?.id ?? null);
    setHoverPoint(hoverHit ? { x: pointerX, y: pointerY } : null);
    if (!draggingId) return;

    setFurniture((prev) =>
      prev.map((item) => {
        if (item.id !== draggingId) return item;

        const widthPx = metersToPixels(item.width);
        const lengthPx = metersToPixels(item.length);

        const validPos = keepFurnitureInRoom(
          pointerX - dragOffset.current.x,
          pointerY - dragOffset.current.y,
          widthPx,
          lengthPx,
        );

        return { ...item, x: validPos.x, y: validPos.y };
      }),
    );
  };

  // End pointer drag and clear transient hover state.
  const endMovingFurniture = () => {
    if (draggingId) setDraggingId(null);
    setHoveredFurnitureId(null);
    setHoverPoint(null);
  };

  // Canvas pointer down selects top-most hit furniture and starts drag.
  const onCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!roomRef.current) return;

    const pointer = getUnscaledRoomPoint(event.clientX, event.clientY);
    if (!pointer) return;
    const pointerX = pointer.x;
    const pointerY = pointer.y;

    const hit = [...furniture]
      .reverse()
      .find((item) => {
        const wPx = metersToPixels(item.width);
        const hPx = metersToPixels(item.length);
        const cx = item.x + wPx / 2;
        const cy = item.y + hPx / 2;
        const angle = -((item.rotation ?? 0) * Math.PI) / 180;
        const dx = pointerX - cx;
        const dy = pointerY - cy;
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle) + cx;
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle) + cy;
        return (
          localX >= item.x &&
          localX <= item.x + wPx &&
          localY >= item.y &&
          localY <= item.y + hPx
        );
      });

    if (!hit) {
      setSelectedFurnitureId(null);
      setActiveDetailsTab("room");
      return;
    }

    dragOffset.current = { x: pointerX - hit.x, y: pointerY - hit.y };
    setDraggingId(hit.id);
    setSelectedFurnitureId(hit.id);
    setActiveDetailsTab("furniture");
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  // Update currently selected furniture with bounds re-validation.
  const updateSelectedFurniture = (patch: Partial<PlacedFurniture>) => {
    if (!selectedFurnitureId) return;
    setFurniture((prev) =>
      prev.map((item) => {
        if (item.id !== selectedFurnitureId) return item;
        const updated = { ...item, ...patch };
        const widthPx = metersToPixels(updated.width);
        const lengthPx = metersToPixels(updated.length);
        const validPos = keepFurnitureInRoom(updated.x, updated.y, widthPx, lengthPx);
        return {
          ...updated,
          x: validPos.x,
          y: validPos.y,
        };
      }),
    );
  };

  // Color update helper for selected furniture.
  const setSelectedFurnitureColor = (newColor: string) => {
    if (!selectedFurnitureId) return;
    setFurniture((prev) =>
      prev.map((item) => (item.id === selectedFurnitureId ? { ...item, color: newColor } : item)),
    );
  };

  // Remove currently selected furniture and focus room details tab.
  const deleteSelectedFurniture = () => {
    if (!selectedFurnitureId) return;
    setFurniture((prev) => prev.filter((item) => item.id !== selectedFurnitureId));
    setSelectedFurnitureId(null);
    setActiveDetailsTab("room");
    window.requestAnimationFrame(() => {
      document.getElementById("design-2d-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", "#design-2d-section");
    });
  };

  // Serialize current 2D state into payload used by save + 3D route.
  const getCurrentDesignPayload = () => ({
    room: {
      width: roomWidth,
      length: roomLength,
      height: roomHeight,
      shape: roomShape,
      colorScheme: selectedSchemeName,
      cutWidth: roomShape === "lshape" ? roomCutWidth : 0,
      cutLength: roomShape === "lshape" ? roomCutLength : 0,
    },
    furniture: furniture.map((item) => ({
      id: item.id,
      type: item.type ?? item.label.toLowerCase(),
      name: item.label,
      x: item.x,
      y: item.y,
      width: item.width,
      length: item.length,
      height: item.height,
      rotation: item.rotation ?? 0,
      color: item.color ?? "#8B6C56",
    })),
  });

  // Save current design into localStorage list used by Saved Designs page.
  const saveCurrentDesign = async () => {
    const name = saveDesignName.trim();
    if (!name) {
      setSaveDesignMessage("Please enter a design name.");
      return;
    }

    const payload = getCurrentDesignPayload();

    // Attempt to persist on server if we have a token
    if (token) {
      try {
        let result;
        if (isEditorOnlyPage && sourceDesignId) {
          result = await updateDesign(sourceDesignId, name, payload, token);
        } else {
          result = await createDesign(name, payload, token);
        }
        if (!result.error) {
          setSaveDesignMessage("Design saved successfully.");
          setSaveDesignName("");
        } else {
          setSaveDesignMessage("Unable to save design. " + (result.error || ""));
        }
      } catch (e) {
        setSaveDesignMessage("Unable to save design. Please try again.");
      }
    } else {
      // Fallback to localStorage for unauthenticated mode
      const designEntry = {
        id: `saved-${Date.now()}`,
        name,
        modifiedAt: new Date().toISOString(),
        ...payload,
      };

      try {
        const raw = window.localStorage.getItem("furnivision_saved_designs");
        const existing = raw ? (JSON.parse(raw) as unknown[]) : [];
        const next = [designEntry, ...existing];
        window.localStorage.setItem("furnivision_saved_designs", JSON.stringify(next));
        setSaveDesignMessage("Design saved successfully.");
        setSaveDesignName("");
      } catch {
        setSaveDesignMessage("Unable to save design. Please try again.");
      }
    }
  };

  // Persist current payload and navigate to 3D page.
  const proceedTo3DDesign = () => {
    const payload = getCurrentDesignPayload();

    try {
      window.localStorage.setItem("furnivision_design", JSON.stringify(payload));
    } catch {
      // Keep navigation behavior even if storage quota/privacy mode blocks writes.
    }
    if (isEditorOnlyPage && sourceDesignId) {
      router.push(`/3d-design?designId=${encodeURIComponent(sourceDesignId)}`);
      return;
    }
    router.push("/3d-design");
  };

  // Main 2D canvas renderer effect:
  // draws room, furniture, selection state, labels, and hover tooltip.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = Math.max(1, Math.round(roomPixelWidth));
    canvas.height = Math.max(1, Math.round(roomPixelLength));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (roomShape === "lshape") {
      const cutStartX = canvas.width - roomCutWidthPx;
      const cutEndY = roomCutLengthPx;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cutStartX, 0);
      ctx.lineTo(cutStartX, cutEndY);
      ctx.lineTo(canvas.width, cutEndY);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fillStyle = selectedScheme.colors[0];
      ctx.fill();
      ctx.strokeStyle = "#666a70";
      ctx.lineWidth = 12;
      ctx.stroke();
    } else {
      ctx.fillStyle = selectedScheme.colors[0];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (const item of furniture) {
      const x = item.x;
      const y = item.y;
      const w = item.width * pxPerMeter;
      const h = item.length * pxPerMeter;
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      const isSelected = item.id === selectedFurnitureId;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(((item.rotation ?? 0) * Math.PI) / 180);
      ctx.translate(-w / 2, -h / 2);

      ctx.fillStyle = item.color;
      ctx.strokeStyle = "#1f1f1f";
      ctx.lineWidth = 2;

      if (item.type === "sofa") {
        const r = Math.max(6, Math.min(w, h) * 0.12);
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r);
        ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hexToRgba("#ffffff", 0.35);
        const cushionW = w * 0.28;
        const cushionH = h * 0.45;
        const gap = w * 0.06;
        const startX = (w - (cushionW * 2 + gap)) / 2;
        const cushionY = h * 0.28;
        ctx.fillRect(startX, cushionY, cushionW, cushionH);
        ctx.fillRect(startX + cushionW + gap, cushionY, cushionW, cushionH);
      } else if (item.type === "table") {
        if (Math.abs(w - h) < 8) {
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(0, 0, w, h);
          ctx.strokeRect(0, 0, w, h);
        }
      } else if (item.type === "chair") {
        const seatW = w * 0.7;
        const seatH = h * 0.45;
        const seatX = (w - seatW) / 2;
        const seatY = h * 0.4;
        const backW = w * 0.58;
        const backH = h * 0.26;
        const backX = (w - backW) / 2;
        ctx.fillRect(seatX, seatY, seatW, seatH);
        ctx.strokeRect(seatX, seatY, seatW, seatH);
        ctx.fillRect(backX, h * 0.1, backW, backH);
        ctx.strokeRect(backX, h * 0.1, backW, backH);
      } else if (item.type === "cupboard") {
        ctx.fillRect(0, 0, w, h);
        ctx.strokeRect(0, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
      } else {
        ctx.fillRect(0, 0, w, h);
        ctx.strokeRect(0, 0, w, h);
      }

      if (isSelected) {
        ctx.strokeStyle = "#2d6cdf";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
      }

      ctx.restore();

      const labelX = x + w / 2;
      const labelY = Math.min(canvas.height - 4, y + h + 12);
      ctx.save();
      ctx.font = "11px Inter, sans-serif";
      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, labelX, labelY);
      ctx.restore();
    }

    if (hoveredFurnitureId && hoverPoint) {
      const hoveredItem = furniture.find((item) => item.id === hoveredFurnitureId);
      if (hoveredItem) {
        const tooltipText = `${hoveredItem.label} • ${hoveredItem.width.toFixed(1)}m × ${hoveredItem.length.toFixed(1)}m`;
        ctx.save();
        ctx.font = "12px Inter, sans-serif";
        const textWidth = ctx.measureText(tooltipText).width;
        const padX = 8;
        const padY = 6;
        const tooltipW = textWidth + padX * 2;
        const tooltipH = 26;
        const tooltipX = clamp(hoverPoint.x + 10, 0, Math.max(0, canvas.width - tooltipW));
        const tooltipY = clamp(hoverPoint.y - tooltipH - 10, 0, Math.max(0, canvas.height - tooltipH));

        ctx.fillStyle = "rgba(55, 36, 20, 0.88)";
        ctx.fillRect(tooltipX, tooltipY, tooltipW, tooltipH);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX, tooltipY, tooltipW, tooltipH);
        ctx.fillStyle = "#f7ebdf";
        ctx.textBaseline = "middle";
        ctx.fillText(tooltipText, tooltipX + padX, tooltipY + tooltipH / 2);
        ctx.restore();
      }
    }
  }, [
    furniture,
    hoverPoint,
    hoveredFurnitureId,
    roomPixelLength,
    roomPixelWidth,
    roomShape,
    selectedFurnitureId,
    selectedScheme.colors,
  ]);

  // Reusable canvas viewport block used in normal and fullscreen modes.
  const renderRoomCanvas = (heightClass: string) => (
    <div
      ref={canvasViewportRef}
      className={`${heightClass} overflow-auto rounded-lg border border-[#e7e0d8] bg-white p-3 flex items-center justify-center`}
    >
      <div
        className="relative inline-block pb-8 pr-10"
        style={{ width: roomPixelWidth * zoom + 64, height: roomPixelLength * zoom + 56 }}
      >
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-white/90 px-2 py-0.5 text-[10px] text-[#4d3525] shadow-sm">
          W: {roomWidth.toFixed(1)}m
        </div>
        <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 rotate-90 rounded bg-white/90 px-2 py-0.5 text-[10px] text-[#4d3525] shadow-sm">
          L: {roomLength.toFixed(1)}m
        </div>
        <div
          ref={roomRef}
          onDrop={onRoomDrop}
          onDragOver={(event) => event.preventDefault()}
          onPointerMove={onRoomPointerMove}
          onPointerUp={endMovingFurniture}
          onPointerLeave={endMovingFurniture}
          className={`relative box-border select-none shadow-[0_1px_6px_rgba(31,31,31,0.08)] ${
            roomShape === "lshape" ? "" : "border-[12px] border-[#666a70]"
          }`}
          style={{
            width: roomPixelWidth * zoom + 24,
            height: roomPixelLength * zoom + 24,
            background: roomShape === "lshape" ? "transparent" : selectedScheme.colors[0],
            borderRadius: roomShape === "square" ? "12px" : "6px",
          }}
        >
        <canvas
          ref={canvasRef}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onRoomPointerMove}
          onPointerUp={endMovingFurniture}
          onPointerLeave={endMovingFurniture}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
        />
      </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      {/* Page shell with optional top nav + setup form + 2D editor + footer. */}
      <main className="min-h-screen overflow-y-auto scroll-smooth bg-white text-[#372414]">
      <div className="min-h-screen bg-white">
        <div className="w-full px-0">
          <div className="flex flex-col">
            {!isEditorOnlyPage ? (
            <header className="fixed inset-x-0 top-0 z-50 w-full rounded-none border border-[#e8e2da] border-x-0 border-t-0 bg-white/80 text-[#4d3525] shadow-[0_1px_6px_rgba(31,31,31,0.05)] backdrop-blur-md">
              <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#b7a087] bg-[#825a3c] text-sm font-semibold text-[#f7ebdf]">
                    FV
                  </div>
                  <p className="text-xl font-semibold [font-family:Inter,sans-serif]">
                    FurniVision
                  </p>
                </div>

                <nav className="order-3 flex w-full items-center justify-center gap-[50px] text-lg text-[#4d3525] md:order-none md:w-auto">
                  <Link
                    href="/dashboard"
                    className="border-b-2 border-transparent pb-1 [font-family:Inter,sans-serif]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/new-design"
                    className="border-b-2 border-[#4d3525] pb-1 font-medium [font-family:Inter,sans-serif]"
                  >
                    New Design
                  </Link>
                  <Link
                    href="/saved-designs"
                    className="border-b-2 border-transparent pb-1 [font-family:Inter,sans-serif]"
                  >
                    Saved Designs
                  </Link>
                </nav>

                <ProfileMenu />
              </div>
            </header>
            ) : null}
            {!isEditorOnlyPage ? <div className="h-[78px]" /> : null}

            {!isEditorOnlyPage ? (
            <section className="relative overflow-hidden rounded-none border border-[#e7e0d8] border-b-0 border-x-0 bg-[#fcfbfa] shadow-[0_1px_6px_rgba(31,31,31,0.04)]">
              <div
                className="absolute inset-0 scale-110 bg-cover bg-center blur-[0.5px]"
                style={{ backgroundImage: `url(${bedroomImage.src})` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,253,250,0.94)_0%,rgba(249,244,238,0.92)_58%,rgba(244,235,224,0.9)_100%)]" />
              <div className="relative">
              <div className="mx-auto flex min-h-[calc(100vh-84px)] w-full max-w-[1500px] flex-col px-6 py-6 md:px-10 md:py-8">
                <h1 className="text-center text-2xl [font-family:Inter,sans-serif] md:text-3xl">
                  Create Your Room Design
                </h1>
                <p className="mt-1 text-center text-base text-[#6b4e3a] md:text-lg">
                  Fill in the form to create your room and generate your 2D and 3D design view.
                </p>

                <div className="mx-auto mt-8 w-full max-w-[1000px] rounded-2xl border border-[#e7e0d8] bg-white p-8 shadow-[0_1px_6px_rgba(31,31,31,0.04)] md:mt-10 md:p-10">
                  <div className="grid gap-10 md:grid-cols-[230px_1fr] md:items-center">
                    <label className="text-base text-[#4d3525] md:text-lg">Room Dimensions (m)</label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-sm text-[#6b4e3a]">Width</span>
                        <input
                          value={roomWidthInput}
                          onChange={(event) => handleRoomWidthChange(event.target.value)}
                          onBlur={commitRoomWidth}
                          type="number"
                          step="0.1"
                          className="w-full rounded-lg border border-[#d4c8bc] bg-[#fcfaf8] px-4 py-2 text-base text-[#4d3525] outline-none"
                        />
                        <p className="mt-1 text-[11px] text-black [font-family:Inter,sans-serif]">
                          Adjust between 2 - 10 meters
                        </p>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm text-[#6b4e3a]">Length</span>
                        <input
                          value={roomLengthInput}
                          onChange={(event) => handleRoomLengthChange(event.target.value)}
                          onBlur={commitRoomLength}
                          type="number"
                          step="0.1"
                          className="w-full rounded-lg border border-[#d4c8bc] bg-[#fcfaf8] px-4 py-2 text-base text-[#4d3525] outline-none"
                        />
                        <p className="mt-1 text-[11px] text-black [font-family:Inter,sans-serif]">
                          Adjust between 2 - 10 meters
                        </p>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm text-[#6b4e3a]">Height</span>
                        <input
                          value={roomHeightInput}
                          onChange={(event) => handleRoomHeightChange(event.target.value)}
                          onBlur={commitRoomHeight}
                          type="number"
                          step="0.1"
                          className="w-full rounded-lg border border-[#d4c8bc] bg-[#fcfaf8] px-4 py-2 text-base text-[#4d3525] outline-none"
                        />
                        <p className="mt-1 text-[11px] text-black [font-family:Inter,sans-serif]">
                          Adjust between 2 - 10 meters
                        </p>
                      </label>
                    </div>

                    <label className="text-base text-[#4d3525] md:text-lg">Room Shape</label>
                    <select
                      value={roomShape}
                      onChange={(event) => handleRoomShapeChange(event.target.value as RoomShape)}
                      className="w-full rounded-lg border border-[#d4c8bc] bg-[#fcfaf8] px-4 py-2 text-base text-[#4d3525] outline-none"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="square">Square</option>
                      <option value="lshape">L-Shape</option>
                    </select>

                    <label className="text-base text-[#4d3525] md:text-lg">Color Scheme</label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {colorSchemes.map((scheme) => {
                        const isActive = selectedSchemeName === scheme.name;
                        return (
                          <div
                            key={scheme.name}
                            className={`min-w-[250px] rounded-xl border px-2.5 py-2 text-left ${
                              isActive
                                ? "border-[#7b5a44] bg-[#efe4d8]"
                                : "border-[#d4c8bc] bg-[#fcfaf8]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => setSelectedSchemeName(scheme.name)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-[#b7a087]">
                                  <div
                                    className="h-full w-full"
                                    style={{
                                      background: `linear-gradient(135deg, ${scheme.colors[0]} 0%, ${scheme.colors[1]} 32%, ${scheme.colors[2]} 68%, ${scheme.colors[3]} 100%)`,
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[15px] font-medium leading-tight text-[#4d3525]">{scheme.name}</p>
                                  <p className="truncate text-xs text-[#6b4e3a]">{scheme.bestFor}</p>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSchemeName(scheme.name);
                                  setColorInfoSchemeName(scheme.name);
                                  setIsColorInfoOpen(true);
                                }}
                                className="rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-xs text-[#4d3525] transition hover:bg-[#f5eee8]"
                              >
                                Info
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-4 gap-1">
                              {scheme.colors.map((color) => (
                                <span
                                  key={`${scheme.name}-${color}`}
                                  className="h-2.5 rounded border border-[#b7a087]/70"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              <div className="mt-auto pt-6 text-center">
                <Link
                  href="/edit-2d#design-2d-section"
                  className="inline-block rounded-lg border border-[#6b4934] bg-[linear-gradient(135deg,#5a3e2d_0%,#825a3c_100%)] px-9 py-2.5 text-lg font-medium text-[#f7ebdf] shadow-sm transition hover:brightness-105"
                >
                  Proceed to 2D Layout
                </Link>
              </div>
              </div>
              </div>
            </section>
            ) : null}
          </div>

          {/* Main 2D editor section (library + canvas + details panel). Only shown on /edit-2d. */}
          {isEditorOnlyPage ? (
          <section
            id="design-2d-section"
            className="min-h-screen rounded-none border border-[#e7e0d8] border-t-0 border-x-0 bg-[#fcfbfa] px-4 py-5 shadow-[0_1px_6px_rgba(31,31,31,0.04)] md:px-6 md:py-6"
          >
            {isEditorOnlyPage ? (
              <div className="mb-3">
                <Link
                  href={backToSavedHref}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#d4c8bc] bg-white px-3 py-1.5 text-sm text-[#4d3525] transition hover:bg-[#f7f3ef]"
                >
                  <span aria-hidden="true">{"<"}</span>
                  <span>Back to Saved Designs</span>
                </Link>
              </div>
            ) : null}
            {/* 2D title + zoom controls row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-center text-2xl [font-family:Inter,sans-serif]">2D Design</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.5, 2))}
                  className="rounded-lg border border-[#d4c8bc] bg-white px-3 py-1 text-sm transition hover:bg-[#f7f3ef]"
                >
                  -
                </button>
                <span className="min-w-16 text-center text-sm">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.5, 2))}
                  className="rounded-lg border border-[#d4c8bc] bg-white px-3 py-1 text-sm transition hover:bg-[#f7f3ef]"
                >
                  +
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="rounded-lg border border-[#d4c8bc] bg-white px-3 py-1 text-sm transition hover:bg-[#f7f3ef]"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* 3-column editor layout: left library, center canvas, right details */}
            <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr_320px]">
              {/* Left: furniture library with search/filter and variant controls */}
              <aside className="h-[clamp(460px,62vh,620px)] overflow-y-auto rounded-lg border border-white/60 bg-white/55 p-3 shadow-[0_8px_24px_rgba(31,31,31,0.08)] backdrop-blur-md">
                <h3 className="border-b border-[#ece4db] pb-2 text-xl [font-family:Inter,sans-serif]">
                  Furniture Library
                </h3>
                <p className="mt-2 text-xs text-[#7b604a]">
                  Select the furniture you want, then drag and drop it onto the canvas.
                </p>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#7b604a]">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" aria-hidden="true">
                      <circle cx="9" cy="9" r="5.5" strokeWidth="1.7" />
                      <path d="M13.5 13.5L18 18" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(event) => setLibrarySearch(event.target.value)}
                    placeholder="Search furniture"
                    className="w-full rounded-lg border border-[#d4c8bc] bg-white py-2 pl-8 pr-3 text-sm text-[#4d3525] outline-none"
                  />
                </div>
                <div className="mt-2 space-y-2">
                  {filteredLibraryItems.map((item, index) => (
                    <article
                      key={`${item.type}-${item.label}-${index}`}
                      draggable
                      onDragStart={(event) => onLibraryDragStart(event, item)}
                      className="rounded-lg border border-[#e2d8cc] bg-[#fcfaf8] px-3 py-2.5"
                    >
                      <div className="flex items-center">
                        <div className="min-w-0 flex-1">
                          <p className="text-base text-[#4d3525]">{item.label}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#7b604a]">
                        {(
                          item.type === "sofa"
                            ? getSofaWidthBySeats(librarySofaSeats)
                            : item.type === "table"
                              ? getTableConfigByShape(libraryTableShape).width
                              : item.defaultWidth
                        ).toFixed(1)}
                        m{" x "}
                        {(
                          item.type === "table"
                            ? getTableConfigByShape(libraryTableShape).length
                            : item.defaultLength
                        ).toFixed(1)}
                        m
                      </p>
                      {item.type === "sofa" ? (
                        <div className="mt-2">
                          <p className="mb-1 text-xs text-[#6b4e3a]">Seats</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[1, 2, 3].map((seatCount) => (
                              <button
                                key={seatCount}
                                type="button"
                                onClick={() => setLibrarySofaSeats(seatCount)}
                                className="min-w-[44px] rounded border border-[#b7a087] px-3 py-2 text-xs"
                                style={{
                                  backgroundColor: librarySofaSeats === seatCount ? "#d6c3b1" : "#ffffff",
                                }}
                              >
                                {seatCount}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {item.type === "table" ? (
                        <div className="mt-2">
                          <p className="mb-1 text-xs text-[#6b4e3a]">Shape</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(["round", "rectangle"] as const).map((shape) => (
                              <button
                                key={shape}
                                type="button"
                                onClick={() => setLibraryTableShape(shape)}
                                className="min-w-[44px] rounded border border-[#b7a087] px-3 py-2 text-xs capitalize"
                                style={{
                                  backgroundColor: libraryTableShape === shape ? "#d6c3b1" : "#ffffff",
                                }}
                              >
                                {shape}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddFurnitureModalOpen(true)}
                  className="mt-3 w-full rounded-lg border border-[#d4c8bc] bg-white px-3 py-2 text-sm text-[#4d3525] transition hover:bg-[#f5eee8]"
                >
                  + Add New Furniture
                </button>
              </aside>

              {/* Center: 2D room canvas viewport */}
              <div className="flex h-[clamp(460px,62vh,620px)] flex-col rounded-lg border border-white/60 bg-white/55 p-2.5 shadow-[0_8px_24px_rgba(31,31,31,0.08)] backdrop-blur-md">
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCanvasFullscreen(true)}
                    className="rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-sm transition hover:bg-[#f7f3ef]"
                    aria-label="Expand 2D canvas"
                    title="Expand"
                  >
                    ⤢
                  </button>
                </div>
                {!isCanvasFullscreen ? renderRoomCanvas("min-h-0 flex-1") : null}
              </div>

              {/* Right: details editor + proceed button */}
              <div className="flex h-[clamp(460px,62vh,620px)] flex-col gap-3">
              <aside className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/60 bg-white/55 shadow-[0_8px_24px_rgba(31,31,31,0.08)] backdrop-blur-md">
                {/* Room/Furniture tabs (switch detail forms) */}
                <div className="sticky top-0 z-10 border-b border-[#e7ddd2] bg-white/75 px-3 py-2 backdrop-blur-md">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveDetailsTab("room")}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                        activeDetailsTab === "room"
                          ? "border-[#6b4934] bg-[#6b4934] text-white"
                          : "border-[#d4c8bc] bg-white text-[#4d3525] hover:bg-[#f6f1eb]"
                      }`}
                    >
                      Room
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDetailsTab("furniture")}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                        activeDetailsTab === "furniture"
                          ? "border-[#6b4934] bg-[#6b4934] text-white"
                          : "border-[#d4c8bc] bg-white text-[#4d3525] hover:bg-[#f6f1eb]"
                      }`}
                    >
                      Furniture
                    </button>
                  </div>
                </div>

                {/* Active details content */}
                <div className="p-3">
                  {activeDetailsTab === "room" ? (
                    // Room detail controls (dimensions, shape, scheme).
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 text-base">Width (m)</p>
                        <input
                          type="number"
                          step="0.1"
                          value={roomWidthInput}
                          onChange={(event) => handleRoomWidthChange(event.target.value)}
                          onBlur={commitRoomWidth}
                          className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                        />
                        <p className="mt-1 text-[11px] text-black [font-family:Inter,sans-serif]">
                          Adjust between 2 - 10 meters
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-base">Length (m)</p>
                        <input
                          type="number"
                          step="0.1"
                          value={roomLengthInput}
                          onChange={(event) => handleRoomLengthChange(event.target.value)}
                          onBlur={commitRoomLength}
                          className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                        />
                        <p className="mt-1 text-[11px] text-black [font-family:Inter,sans-serif]">
                          Adjust between 2 - 10 meters
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-base">Height (m)</p>
                        <input
                          type="number"
                          step="0.1"
                          value={roomHeightInput}
                          onChange={(event) => handleRoomHeightChange(event.target.value)}
                          onBlur={commitRoomHeight}
                          className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                        />
                        <p className="mt-1 text-[11px] text-black [font-family:Inter,sans-serif]">
                          Adjust between 2 - 10 meters
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-base">Shape</p>
                        <select
                          value={roomShape}
                          onChange={(event) => handleRoomShapeChange(event.target.value as RoomShape)}
                          className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                        >
                          <option value="rectangle">Rectangle</option>
                          <option value="square">Square</option>
                          <option value="lshape">L-Shape</option>
                        </select>
                      </div>
                      <div>
                        <p className="mb-1 text-base">Color Scheme</p>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedSchemeName}
                            onChange={(event) => setSelectedSchemeName(event.target.value)}
                            className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                          >
                            {["Light Neutral", "Warm Beige", "Cool Gray", "Earthy Green"].map((schemeName) => (
                              <option key={`room-select-${schemeName}`} value={schemeName}>
                                {schemeName}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setColorInfoSchemeName(selectedSchemeName);
                              setIsColorInfoOpen(true);
                            }}
                            className="shrink-0 rounded border border-[#b7a087] bg-white px-2 py-1 text-xs text-[#4d3525] hover:bg-[#efe4d8]"
                            aria-label="Color scheme info"
                            title="Info"
                          >
                            i
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Furniture detail controls (shown for selected item).
                    <div className="space-y-3">
                      {!selectedFurniture ? (
                        <p className="text-sm text-[#7b604a]">
                          Select a furniture item on the canvas to edit its details.
                        </p>
                      ) : (
                        <>
                      <p className="text-lg text-[#4d3525]">
                        {selectedFurniture.label} ({selectedFurniture.type})
                      </p>
                      <div>
                        <p className="mb-1 text-base">Width (m)</p>
                        <input
                          type="number"
                          min={0.3}
                          step="0.1"
                          value={selectedFurniture.width}
                          onChange={(event) =>
                            updateSelectedFurniture({
                              width: clamp(Number(event.target.value) || 0, 0.3, 4),
                            })
                          }
                          className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-base">Length (m)</p>
                        <input
                          type="number"
                          min={0.3}
                          step="0.1"
                          value={selectedFurniture.length}
                          onChange={(event) =>
                            updateSelectedFurniture({
                              length: clamp(Number(event.target.value) || 0, 0.3, 4),
                            })
                          }
                          className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                        />
                      </div>
                      {selectedFurniture.type === "cupboard" ? (
                        <div>
                          <p className="mb-1 text-base">Height (m)</p>
                          <input
                            type="number"
                            min={0.8}
                            step="0.1"
                            value={selectedFurniture.height ?? 2}
                            onChange={(event) =>
                              updateSelectedFurniture({
                                height: clamp(Number(event.target.value) || 0.8, 0.8, 3.5),
                              })
                            }
                            className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                          />
                        </div>
                      ) : null}
                      {selectedFurniture.type === "lamp" ? (
                        <div>
                          <p className="mb-1 text-base">Height (m)</p>
                          <input
                            type="number"
                            min={0.5}
                            step="0.1"
                            value={selectedFurniture.height ?? 1.5}
                            onChange={(event) =>
                              updateSelectedFurniture({
                                height: clamp(Number(event.target.value) || 0.5, 0.5, 3),
                              })
                            }
                            className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                          />
                        </div>
                      ) : null}
                      <div>
                        <p className="mb-1 text-base">Rotation</p>
                        <div className="flex items-center gap-2">
                          <div className="flex min-w-[140px] items-center rounded-lg border border-[#d4c8bc] bg-white px-2 py-1.5">
                            <input
                              type="number"
                              step="1"
                              value={selectedFurniture.rotation ?? 0}
                              onChange={(event) =>
                                updateSelectedFurniture({
                                  rotation: Number(event.target.value) || 0,
                                })
                              }
                              className="w-full bg-transparent text-base text-[#4d3525] outline-none"
                            />
                            <span className="text-sm text-[#6a5546]">deg</span>
                          </div>
                          <div className="flex items-center rounded-lg border border-[#d4c8bc] bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedFurniture({
                                  rotation: (((selectedFurniture.rotation ?? 0) + 90) % 360 + 360) % 360,
                                })
                              }
                              className="px-2 py-1.5 text-sm text-[#4d3525] hover:bg-[#efe4d8]"
                              title="Rotate 90 degrees"
                              aria-label="Rotate 90 degrees"
                            >
                              90
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelectedFurniture({ rotation: 0 })}
                              className="border-l border-[#b7a087] px-2 py-1.5 text-sm text-[#4d3525] hover:bg-[#efe4d8]"
                              title="Reset rotation"
                              aria-label="Reset rotation"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>

                      {selectedFurniture.type === "sofa" ? (
                        <div>
                          <p className="mb-1 text-base">Seats</p>
                          <input
                            type="number"
                            min={1}
                            max={3}
                            value={selectedFurniture.seats ?? 3}
                            onChange={(event) =>
                              (() => {
                                const seats = clamp(Number(event.target.value) || 1, 1, 3);
                                updateSelectedFurniture({
                                  seats,
                                  width: getSofaWidthBySeats(seats),
                                  label: `${seats}-Seat Sofa`,
                                  imageSrc: getSofaImageBySeats(seats),
                                });
                              })()
                            }
                            className="w-full rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-base outline-none"
                          />
                        </div>
                      ) : null}
                        </>
                      )}

                      {selectedFurniture ? (
                        <>
                        <div>
                          <p className="mb-2 text-base">Color</p>
                          <div className="grid grid-cols-5 gap-2">
                            {furnitureColorSwatches.map((color) => {
                              const isActive = selectedColor.toUpperCase() === color;
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setSelectedFurnitureColor(color)}
                                  className={`h-8 rounded-md border ${
                                    isActive ? "border-[#4d3525] ring-1 ring-[#4d3525]" : "border-[#b7a087]"
                                  }`}
                                  style={{ backgroundColor: color }}
                                  aria-label={`Set furniture color ${color}`}
                                />
                              );
                            })}
                          </div>
                          <p className="mt-2 text-xs text-[#6b4e3a]">Pick a custom color</p>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedColor}
                              onChange={(event) => setSelectedFurnitureColor(event.target.value)}
                              className="h-9 w-12 cursor-pointer rounded border border-[#b7a087] bg-white p-0.5"
                              aria-label="Pick custom furniture color"
                            />
                            <span className="rounded-lg border border-[#d4c8bc] bg-white px-2 py-1 text-xs text-[#4d3525]">
                              {selectedColor.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            deleteSelectedFurniture();
                          }}
                          className="w-full rounded-lg border border-[#a93d2f] bg-[#c94b3a] px-3 py-2 text-base text-white shadow-sm transition hover:bg-[#b34031]"
                        >
                          Delete Furniture
                        </button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

              </aside>
              {/* Primary action to push current payload into 3D view */}
              <button
                type="button"
                onClick={proceedTo3DDesign}
                className="block w-full rounded-lg border border-[#6b4934] bg-[linear-gradient(135deg,#5a3e2d_0%,#825a3c_100%)] px-5 py-2 text-center text-base font-medium text-[#f7ebdf] shadow-sm transition hover:brightness-105"
              >
                {isEditorOnlyPage ? "View in 3D" : "Proceed to 3D Design"}
              </button>
              </div>
            </div>
            {/* Save design controls under the editor */}
            <div className="mt-3 flex flex-col items-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  type="text"
                  value={saveDesignName}
                  onChange={(event) => setSaveDesignName(event.target.value)}
                  placeholder="Enter design name"
                  className="w-[220px] rounded-lg border border-[#d4c8bc] bg-white px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={saveCurrentDesign}
                  className="rounded-lg border border-[#6b4934] bg-[linear-gradient(135deg,#5a3e2d_0%,#825a3c_100%)] px-4 py-2 text-sm font-medium text-[#f7ebdf] shadow-sm transition hover:brightness-105"
                >
                  Save Design
                </button>
              </div>
              {saveDesignMessage ? (
                <p className="mt-2 text-right text-xs text-[#5f4737]">{saveDesignMessage}</p>
              ) : null}
            </div>
          </section>
          ) : null}

          {/* Footer hidden in /edit-2d mode */}
          {!isEditorOnlyPage ? <SiteFooter /> : null}

          {/* Add-custom-furniture modal */}
          {isAddFurnitureModalOpen ? (
            <div className="fixed inset-0 z-[122] flex items-center justify-center bg-[#1f140d]/45 p-4 backdrop-blur-[1px]">
              <div className="w-full max-w-md rounded-2xl border border-[#c7b4a5] bg-[#f7ebdf] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#d5c6b8] px-6 py-3">
                  <h2 className="text-2xl [font-family:Inter,sans-serif]">Add New Furniture</h2>
                  <button
                    type="button"
                    onClick={() => setIsAddFurnitureModalOpen(false)}
                    className="text-2xl leading-none text-[#5a463a] hover:text-[#372414]"
                    aria-label="Close add furniture modal"
                  >
                    x
                  </button>
                </div>
                <div className="space-y-3 px-6 py-5">
                  <div>
                    <p className="mb-1 text-sm text-[#4d3525]">Name</p>
                    <input
                      type="text"
                      value={newFurnitureName}
                      onChange={(event) => setNewFurnitureName(event.target.value)}
                      placeholder="e.g., Bed"
                      className="w-full rounded-md border border-[#b7a087] bg-white px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-[#4d3525]">Category / Type</p>
                    <select
                      value={newFurnitureType}
                      onChange={(event) => setNewFurnitureType(event.target.value as FurnitureType)}
                      className="w-full rounded-md border border-[#b7a087] bg-white px-3 py-2 text-sm outline-none"
                    >
                      <option value="sofa">sofa</option>
                      <option value="table">table</option>
                      <option value="chair">chair</option>
                      <option value="bed">bed</option>
                      <option value="storage">storage</option>
                      <option value="other">other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 text-sm text-[#4d3525]">Default width (m)</p>
                      <input
                        type="number"
                        min={0.3}
                        step="0.1"
                        value={newFurnitureWidth}
                        onChange={(event) => setNewFurnitureWidth(Number(event.target.value) || 0.3)}
                        className="w-full rounded-md border border-[#b7a087] bg-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-[#4d3525]">Default length (m)</p>
                      <input
                        type="number"
                        min={0.3}
                        step="0.1"
                        value={newFurnitureLength}
                        onChange={(event) => setNewFurnitureLength(Number(event.target.value) || 0.3)}
                        className="w-full rounded-md border border-[#b7a087] bg-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-[#4d3525]">Optional icon</p>
                    <select
                      value={newFurnitureIconMode}
                      onChange={(event) => setNewFurnitureIconMode(event.target.value as "generic" | "none")}
                      className="w-full rounded-md border border-[#b7a087] bg-white px-3 py-2 text-sm outline-none"
                    >
                      <option value="generic">Generic placeholder</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#d5c6b8] px-6 py-3">
                  <button
                    type="button"
                    onClick={() => setIsAddFurnitureModalOpen(false)}
                    className="rounded-md border border-[#b7a087] bg-white px-3 py-1.5 text-sm text-[#4d3525]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addCustomFurnitureItem}
                    className="rounded-md border border-[#6b4934] bg-[linear-gradient(135deg,#4e3527_0%,#825a3c_100%)] px-3 py-1.5 text-sm text-[#f7ebdf]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Fullscreen canvas modal */}
          {isCanvasFullscreen ? (
            <div className="fixed inset-0 z-[120] bg-[#1f140d]/30 p-4 backdrop-blur-[1px]">
              <div className="mx-auto h-full w-full max-w-[1200px] rounded-xl border border-[#e2d8cc] bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-lg [font-family:Inter,sans-serif]">2D Canvas View</p>
                  <button
                    type="button"
                    onClick={() => setIsCanvasFullscreen(false)}
                    className="rounded-lg border border-[#d4c8bc] bg-white px-3 py-1 text-sm transition hover:bg-[#f7f3ef]"
                    aria-label="Close expanded canvas"
                  >
                    Close
                  </button>
                </div>
                {renderRoomCanvas("h-[calc(100vh-120px)]")}
              </div>
            </div>
          ) : null}

          {/* Color scheme information modal */}
          {isColorInfoOpen ? (
            <div className="fixed inset-0 z-[121] flex items-center justify-center bg-[#1f140d]/45 p-4 backdrop-blur-[1px]">
              <div className="w-full max-w-lg rounded-2xl border border-[#d8ccbf] bg-[#fbf7f2] shadow-xl">
                <div className="flex items-center justify-between border-b border-[#d5c6b8] px-6 py-3">
                  <h2 className="text-2xl [font-family:Inter,sans-serif]">
                    {colorInfoScheme.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsColorInfoOpen(false)}
                    className="text-2xl leading-none text-[#5a463a] hover:text-[#372414]"
                    aria-label="Close color scheme details"
                  >
                    x
                  </button>
                </div>
                <div className="space-y-3 px-6 py-5">
                  <div
                    className="h-20 rounded-lg border border-[#b7a087]"
                    style={{
                      background: `linear-gradient(135deg, ${colorInfoScheme.colors[0]} 0%, ${colorInfoScheme.colors[1]} 32%, ${colorInfoScheme.colors[2]} 68%, ${colorInfoScheme.colors[3]} 100%)`,
                    }}
                  />
                  <p className="text-base text-[#4d3525]">{colorInfoScheme.description}</p>
                  <p className="text-sm text-[#6b4e3a]">
                    Best for: {colorInfoScheme.bestFor}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {rangeErrorMessage ? (
            <div className="fixed inset-0 z-[123] flex items-center justify-center bg-[#1f140d]/45 p-4">
              <div className="w-full max-w-sm rounded-xl border border-[#d8ccbf] bg-white p-5 shadow-xl">
                <p className="text-sm text-[#372414] [font-family:Inter,sans-serif]">{rangeErrorMessage}</p>
                <button
                  type="button"
                  onClick={() => setRangeErrorMessage(null)}
                  className="mt-4 w-full rounded-lg border border-[#6b4934] bg-[linear-gradient(135deg,#5a3e2d_0%,#825a3c_100%)] px-3 py-2 text-sm text-[#f7ebdf]"
                >
                  OK
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
    </ProtectedRoute>
  );
}



