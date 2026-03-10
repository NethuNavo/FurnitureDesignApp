"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useAuth } from "@/lib/hooks/useAuth";
import { getDesignById } from "@/lib/api";

// Furniture payload restored from localStorage (saved from 2D page).
type StoredFurniture = {
  id: string;
  type: string;
  name?: string;
  x: number; // px in 2D
  y: number; // px in 2D
  width: number; // meters
  length: number; // meters
  height?: number; // meters
  rotation?: number;
  color?: string;
};

// Full design payload passed between 2D and 3D pages.
type StoredDesign = {
  room: {
    width: number;
    length: number;
    height: number;
    shape: "rectangle" | "square" | "lshape" | "Rectangle" | "Square" | "L-Shape" | string;
    colorScheme: string;
    cutWidth?: number;
    cutLength?: number;
  };
  furniture: StoredFurniture[];
};

// Minimal info shown in the "Selected: ..." badge.
type SelectedFurnitureInfo = {
  id: string;
  name: string;
  width: number;
  length: number;
};

// Keep this in sync with 2D page conversion.
const pxPerMeter = 100;

// Normalize shape values coming from different casing/labels.
function normalizeRoomShape(value: string | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized === "square") return "square" as const;
  if (normalized === "lshape" || normalized === "l-shape") return "lshape" as const;
  return "rectangle" as const;
}

// Keep furniture inside room bounds.
// Inputs: top-left position in meters + furniture size + room shape data.
// Output: clamped top-left meters.
function clampFurnitureTopLeftMeters(
  x: number,
  z: number,
  width: number,
  length: number,
  roomWidth: number,
  roomLength: number,
  roomShape: "rectangle" | "square" | "lshape",
  cutWidth: number,
  cutLength: number,
) {
  // Clamp against full room rectangle first.
  const maxX = Math.max(0, roomWidth - width);
  const maxZ = Math.max(0, roomLength - length);
  let nextX = Math.max(0, Math.min(maxX, x));
  let nextZ = Math.max(0, Math.min(maxZ, z));

  if (roomShape !== "lshape") return { x: nextX, z: nextZ };

  // For L-shape: if furniture center falls inside the removed cut area,
  // push it to nearest valid edge.
  const cutStartX = roomWidth - cutWidth;
  const cutEndZ = cutLength;
  let centerX = nextX + width / 2;
  let centerZ = nextZ + length / 2;

  if (centerX > cutStartX && centerZ < cutEndZ) {
    const moveX = Math.abs(centerX - cutStartX);
    const moveZ = Math.abs(cutEndZ - centerZ);
    if (moveX <= moveZ) centerX = cutStartX;
    else centerZ = cutEndZ;
    nextX = Math.max(0, Math.min(maxX, centerX - width / 2));
    nextZ = Math.max(0, Math.min(maxZ, centerZ - length / 2));
  }

  return { x: nextX, z: nextZ };
}

export default function ThreeDDesignPage() {
  // Optional design id when opened from Saved Designs.
  const searchParams = useSearchParams();
  const { token } = useAuth();

  // DOM mount for WebGL canvas.
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Runtime refs for camera/controls/default view reset.
  const controlsRef = useRef<InstanceType<typeof OrbitControls> | null>(null);
  const cameraRef = useRef<any>(null);
  const defaultViewRef = useRef<{
    position: any;
    target: any;
  } | null>(null);

  // UI + loaded design state.
  const [storedDesign, setStoredDesign] = useState<StoredDesign | null>(null);
  const [leftMode, setLeftMode] = useState<"rotate" | "pan">("rotate");
  const [selectedFurnitureInfo, setSelectedFurnitureInfo] = useState<SelectedFurnitureInfo | null>(null);
  const sourceDesignId = searchParams.get("designId");
  const isFromSavedDesign = Boolean(sourceDesignId);
  const backToSavedHref = "/saved-designs";
  const editIn2DHref = sourceDesignId
    ? `/edit-2d?designId=${encodeURIComponent(sourceDesignId)}#design-2d-section`
    : "/edit-2d#design-2d-section";

  // Load latest design snapshot from localStorage (only when not opening a saved design).
  useEffect(() => {
    if (isFromSavedDesign) return;
    let timer: number | null = null;
    try {
      const raw = window.localStorage.getItem("furnivision_design");
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredDesign;
      if (parsed?.room) {
        timer = window.setTimeout(() => {
          setStoredDesign(parsed);
        }, 0);
      }
    } catch {
      // Ignore malformed localStorage.
    }
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [isFromSavedDesign]);

  // If we have a designId from saved design, try to fetch it from backend.
  useEffect(() => {
    if (!isFromSavedDesign || !sourceDesignId || !token) return;
    (async () => {
      try {
        const res = await getDesignById(sourceDesignId, token);
        if (!res.error && res.data?.design) {
          setStoredDesign(res.data.design.payload as StoredDesign);
        }
      } catch {
        // ignore
      }
    })();
  }, [isFromSavedDesign, sourceDesignId, token]);

  // Derive normalized room values from loaded payload.
  const room = useMemo(
    () => {
      const shape = normalizeRoomShape(storedDesign?.room?.shape);
      const length = storedDesign?.room?.length ?? 4;
      const width =
        shape === "square" ? length : storedDesign?.room?.width ?? 5;
      return {
        width,
        length,
        height: storedDesign?.room?.height ?? 2.8,
        shape,
        colorScheme: storedDesign?.room?.colorScheme ?? "Light Neutral",
        cutWidth: storedDesign?.room?.cutWidth,
        cutLength: storedDesign?.room?.cutLength,
      };
    },
    [storedDesign],
  );

  // Convenience accessor for furniture array.
  const furniture = useMemo(() => storedDesign?.furniture ?? [], [storedDesign]);

  // Main 3D scene lifecycle.
  useEffect(() => {
    if (!mountRef.current) return;

    // ---------- Scene + renderer ----------
    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#ece6df");

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    container.appendChild(renderer.domElement);

    // ---------- Camera ----------
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200,
    );
    camera.position.set(room.width * 0.8, room.height * 1.3, room.length * 1.4);
    cameraRef.current = camera;

    // ---------- Orbit controls ----------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1;
    controls.panSpeed = 0.8;
    controls.minDistance = 2;
    controls.maxDistance = Math.max(room.width, room.length) * 4;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2.02;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controls.target.set(room.width / 2, room.height * 0.35, room.length / 2);
    controls.update();
    controlsRef.current = controls;
    defaultViewRef.current = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    };

    // ---------- Pointer + selection helpers ----------
    const preventContextMenu = (event: Event) => event.preventDefault();
    const onPointerDown = () => {
      renderer.domElement.style.cursor = "grabbing";
    };
    const onPointerUp = () => {
      renderer.domElement.style.cursor = "grab";
    };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let activeSelectionHelper: any = null;

    // Remove active selection outline and clear selected label.
    const clearSelection = () => {
      if (activeSelectionHelper) {
        scene.remove(activeSelectionHelper);
        activeSelectionHelper.geometry.dispose();
        activeSelectionHelper.material.dispose();
        activeSelectionHelper = null;
      }
      setSelectedFurnitureInfo(null);
    };

    // Attach selection/display metadata to the furniture root and all mesh children,
    // so raycasting any child can still resolve back to one furniture item.
    const applyFurnitureMeta = (object: any, item: StoredFurniture) => {
      const meta: SelectedFurnitureInfo = {
        id: item.id,
        name: item.name || item.type || "Furniture",
        width: item.width,
        length: item.length,
      };
      // Root-level metadata (used when clicking grouped objects).
      object.userData.furnitureMeta = meta;
      object.userData.furnitureRoot = object;
      // `child: any` is intentional to avoid strict Three.js namespace typing issues
      // in this project setup while still supporting mesh checks at runtime.
      object.traverse((child: any) => {
        if ((child as any).isMesh) {
          // Mirror metadata on each mesh so raycast hits on child meshes work.
          child.userData.furnitureMeta = meta;
          child.userData.furnitureRoot = object;
        }
      });
    };

    const onCanvasClick = (event: MouseEvent) => {
      // Convert screen point to normalized device coordinates for raycasting.
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(scene.children, true);

      // Pick first object that has furniture metadata.
      let selectedRoot: any = null;
      let selectedMeta: SelectedFurnitureInfo | null = null;
      for (const hit of intersections) {
        const meta = hit.object.userData?.furnitureMeta as SelectedFurnitureInfo | undefined;
        if (!meta) continue;
        selectedMeta = meta;
        selectedRoot = (hit.object.userData?.furnitureRoot as any) ?? hit.object;
        break;
      }

      if (!selectedRoot || !selectedMeta) {
        clearSelection();
        return;
      }

      // Replace previous selection outline with new one.
      if (activeSelectionHelper) {
        scene.remove(activeSelectionHelper);
        activeSelectionHelper.geometry.dispose();
        activeSelectionHelper.material.dispose();
        activeSelectionHelper = null;
      }

      activeSelectionHelper = new THREE.BoxHelper(selectedRoot, 0x2d6cdf);
      scene.add(activeSelectionHelper);
      setSelectedFurnitureInfo(selectedMeta);
    };

    renderer.domElement.addEventListener("contextmenu", preventContextMenu);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("click", onCanvasClick);

    // ---------- Lighting ----------
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(6, 8, 5);
    scene.add(dir);

    // ---------- Room geometry ----------
    const roomShape = room.shape;
    const cutWidth = roomShape === "lshape" ? Math.max(0, room.cutWidth ?? room.width * 0.4) : 0;
    const cutLength = roomShape === "lshape" ? Math.max(0, room.cutLength ?? room.length * 0.4) : 0;
    const floorMat = new THREE.MeshStandardMaterial({ color: "#ddd4ca", side: THREE.DoubleSide });
    const wallMat = new THREE.MeshStandardMaterial({ color: "#f6f3ef", side: THREE.DoubleSide });

    if (roomShape === "lshape") {
      // L-shaped floor from polygon points (no full rectangle).
      const cutStartX = room.width - cutWidth;
      const cutEndZ = cutLength;
      const lShape = new THREE.Shape();
      lShape.moveTo(0, 0);
      lShape.lineTo(cutStartX, 0);
      lShape.lineTo(cutStartX, -cutEndZ);
      lShape.lineTo(room.width, -cutEndZ);
      lShape.lineTo(room.width, -room.length);
      lShape.lineTo(0, -room.length);
      lShape.closePath();
      const floor = new THREE.Mesh(new THREE.ShapeGeometry(lShape), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0, 0);
      scene.add(floor);
    } else {
      // Rectangle/square: floor + 2 walls (open room for easier viewing).
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(room.width, room.length), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(room.width / 2, 0, room.length / 2);
      scene.add(floor);

      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(room.width, room.height), wallMat);
      backWall.position.set(room.width / 2, room.height / 2, 0);
      scene.add(backWall);

      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(room.length, room.height), wallMat);
      leftWall.rotation.y = Math.PI / 2;
      leftWall.position.set(0, room.height / 2, room.length / 2);
      scene.add(leftWall);
    }

    // ---------- Furniture rendering ----------
    for (const item of furniture) {
      const itemType = (item.type || "").toLowerCase();
      const color = item.color || "#8B6C56";

      // Convert stored 2D pixel top-left to 3D meters, then clamp to valid area.
      const topLeft = clampFurnitureTopLeftMeters(
        item.x / pxPerMeter,
        item.y / pxPerMeter,
        item.width,
        item.length,
        room.width,
        room.length,
        roomShape,
        cutWidth,
        cutLength,
      );
      const xMeters = topLeft.x;
      const zMeters = topLeft.z;

      if (itemType === "sofa") {
        // Procedural sofa model with base, backrest, arms, and seat cushions.
        const sofaGroup = new THREE.Group();
        const sofaName = (item.name || "").toLowerCase();
        let seatCount = 2;
        if (sofaName.includes("1-seat")) seatCount = 1;
        if (sofaName.includes("2-seat")) seatCount = 2;
        if (sofaName.includes("3-seat")) seatCount = 3;

        const baseHeight = 0.38;
        const backHeight = 0.4;
        const armWidth = Math.max(0.1, item.width * 0.09);
        const backDepth = Math.max(0.08, item.length * 0.16);
        const seatDepth = Math.max(0.2, item.length - backDepth - 0.02);
        const baseY = baseHeight / 2;
        const backY = baseHeight + backHeight / 2 - 0.02;

        const baseColor = new THREE.Color(color);
        const frameColor = baseColor.clone().multiplyScalar(0.75);
        const cushionColor = baseColor.clone().multiplyScalar(1.12);
        const frameMat = new THREE.MeshStandardMaterial({ color: frameColor });
        const cushionMat = new THREE.MeshStandardMaterial({ color: cushionColor });

        const sofaBase = new THREE.Mesh(
          new THREE.BoxGeometry(item.width, baseHeight, item.length),
          frameMat,
        );
        sofaBase.position.set(0, baseY, 0);
        sofaGroup.add(sofaBase);

        const backrest = new THREE.Mesh(
          new THREE.BoxGeometry(item.width, backHeight, backDepth),
          frameMat,
        );
        backrest.position.set(0, backY, -item.length / 2 + backDepth / 2);
        sofaGroup.add(backrest);

        const leftArm = new THREE.Mesh(
          new THREE.BoxGeometry(armWidth, backHeight * 0.95, item.length * 0.94),
          frameMat,
        );
        leftArm.position.set(-item.width / 2 + armWidth / 2, backY - 0.03, 0);
        sofaGroup.add(leftArm);

        const rightArm = new THREE.Mesh(
          new THREE.BoxGeometry(armWidth, backHeight * 0.95, item.length * 0.94),
          frameMat,
        );
        rightArm.position.set(item.width / 2 - armWidth / 2, backY - 0.03, 0);
        sofaGroup.add(rightArm);

        const innerWidth = Math.max(0.2, item.width - armWidth * 2 - 0.06);
        const seatGap = 0.03;
        const totalGap = seatGap * (seatCount - 1);
        const cushionWidth = Math.max(0.12, (innerWidth - totalGap) / seatCount);
        const cushionHeight = 0.11;
        const cushionY = baseHeight + cushionHeight / 2 + 0.01;
        const cushionZ = seatDepth / 2 - item.length / 2 + backDepth + 0.02;
        const startX = -innerWidth / 2 + cushionWidth / 2;

        for (let i = 0; i < seatCount; i += 1) {
          const cushion = new THREE.Mesh(
            new THREE.BoxGeometry(cushionWidth, cushionHeight, Math.max(0.14, seatDepth * 0.92)),
            cushionMat,
          );
          cushion.position.set(startX + i * (cushionWidth + seatGap), cushionY, cushionZ);
          sofaGroup.add(cushion);
        }

        sofaGroup.position.set(
          xMeters + item.width / 2,
          0,
          zMeters + item.length / 2,
        );
        sofaGroup.rotation.y = ((item.rotation || 0) * Math.PI) / 180;
        applyFurnitureMeta(sofaGroup, item);
        scene.add(sofaGroup);
        continue;
      }

      if (itemType === "chair") {
        // Procedural chair with seat, backrest, and 4 legs.
        const chairGroup = new THREE.Group();
        const seatThickness = Math.max(0.08, Math.min(0.14, item.width * 0.15));
        const legThickness = Math.max(0.04, Math.min(0.08, Math.min(item.width, item.length) * 0.14));
        const legHeight = 0.45;
        const backHeight = 0.45;
        const backThickness = legThickness;
        const seatY = legHeight + seatThickness / 2;
        const backY = legHeight + seatThickness + backHeight / 2;
        const legY = legHeight / 2;
        const edgeX = item.width / 2 - legThickness / 2;
        const edgeZ = item.length / 2 - legThickness / 2;

        const baseColor = new THREE.Color(color);
        const frameColor = baseColor.clone().multiplyScalar(0.82);
        const seatMat = new THREE.MeshStandardMaterial({ color: baseColor });
        const frameMat = new THREE.MeshStandardMaterial({ color: frameColor });

        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(item.width, seatThickness, item.length),
          seatMat,
        );
        seat.position.set(0, seatY, 0);
        chairGroup.add(seat);

        const backrest = new THREE.Mesh(
          new THREE.BoxGeometry(item.width, backHeight, backThickness),
          frameMat,
        );
        backrest.position.set(0, backY, -item.length / 2 + backThickness / 2);
        chairGroup.add(backrest);

        for (const lx of [-edgeX, edgeX]) {
          for (const lz of [-edgeZ, edgeZ]) {
            const leg = new THREE.Mesh(
              new THREE.BoxGeometry(legThickness, legHeight, legThickness),
              frameMat,
            );
            leg.position.set(lx, legY, lz);
            chairGroup.add(leg);
          }
        }

        chairGroup.position.set(
          xMeters + item.width / 2,
          0,
          zMeters + item.length / 2,
        );
        chairGroup.rotation.y = ((item.rotation || 0) * Math.PI) / 180;
        applyFurnitureMeta(chairGroup, item);
        scene.add(chairGroup);
        continue;
      }

      if (itemType === "table") {
        // Procedural table: round center-leg or rectangular with 4 legs.
        const tableGroup = new THREE.Group();
        const isRoundTable = (item.name || "").toLowerCase().includes("round");
        const topThickness = 0.1;
        const legHeight = 0.7;
        const legThickness = Math.max(0.05, Math.min(0.1, Math.min(item.width, item.length) * 0.12));
        const topY = legHeight + topThickness / 2;
        const legY = legHeight / 2;

        const baseColor = new THREE.Color(color);
        const topColor = baseColor.clone().multiplyScalar(1.02);
        const legColor = baseColor.clone().multiplyScalar(0.75);
        const topMat = new THREE.MeshStandardMaterial({ color: topColor });
        const legMat = new THREE.MeshStandardMaterial({ color: legColor });

        if (isRoundTable) {
          const radius = Math.min(item.width, item.length) / 2;
          const tabletop = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, topThickness, 36),
            topMat,
          );
          tabletop.position.set(0, topY, 0);
          tableGroup.add(tabletop);

          const centerLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(legThickness * 0.55, legThickness * 0.65, legHeight, 20),
            legMat,
          );
          centerLeg.position.set(0, legY, 0);
          tableGroup.add(centerLeg);
        } else {
          const tabletop = new THREE.Mesh(
            new THREE.BoxGeometry(item.width, topThickness, item.length),
            topMat,
          );
          tabletop.position.set(0, topY, 0);
          tableGroup.add(tabletop);

          const edgeX = item.width / 2 - legThickness / 2;
          const edgeZ = item.length / 2 - legThickness / 2;
          for (const lx of [-edgeX, edgeX]) {
            for (const lz of [-edgeZ, edgeZ]) {
              const leg = new THREE.Mesh(
                new THREE.BoxGeometry(legThickness, legHeight, legThickness),
                legMat,
              );
              leg.position.set(lx, legY, lz);
              tableGroup.add(leg);
            }
          }
        }

        tableGroup.position.set(
          xMeters + item.width / 2,
          0,
          zMeters + item.length / 2,
        );
        tableGroup.rotation.y = ((item.rotation || 0) * Math.PI) / 180;
        applyFurnitureMeta(tableGroup, item);
        scene.add(tableGroup);
        continue;
      }

      if (itemType === "cupboard") {
        // Procedural cupboard: body, two doors, and handles.
        const cupboardGroup = new THREE.Group();
        const bodyHeight = Math.max(0.8, Math.min(3.5, item.height ?? 2.0));
        const doorInset = 0.02;
        const plinthHeight = 0.08;
        const handleRadius = 0.012;

        const baseColor = new THREE.Color(color);
        const bodyColor = baseColor.clone().multiplyScalar(0.92);
        const doorColor = baseColor.clone().multiplyScalar(1.03);
        const trimColor = baseColor.clone().multiplyScalar(0.7);

        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor });
        const doorMat = new THREE.MeshStandardMaterial({ color: doorColor });
        const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.2, roughness: 0.6 });

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(item.width, bodyHeight, item.length),
          bodyMat,
        );
        body.position.set(0, bodyHeight / 2, 0);
        cupboardGroup.add(body);

        const plinth = new THREE.Mesh(
          new THREE.BoxGeometry(item.width * 0.98, plinthHeight, item.length * 0.98),
          trimMat,
        );
        plinth.position.set(0, plinthHeight / 2, 0);
        cupboardGroup.add(plinth);

        const doorWidth = Math.max(0.16, item.width / 2 - doorInset * 1.5);
        const doorHeight = bodyHeight - plinthHeight - 0.06;
        const doorDepth = Math.max(0.02, item.length * 0.08);
        const frontZ = item.length / 2 - doorDepth / 2 + 0.001;
        const doorY = plinthHeight + doorHeight / 2;
        const leftDoorX = -doorWidth / 2 - doorInset / 2;
        const rightDoorX = doorWidth / 2 + doorInset / 2;

        const leftDoor = new THREE.Mesh(
          new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth),
          doorMat,
        );
        leftDoor.position.set(leftDoorX, doorY, frontZ);
        cupboardGroup.add(leftDoor);

        const rightDoor = new THREE.Mesh(
          new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth),
          doorMat,
        );
        rightDoor.position.set(rightDoorX, doorY, frontZ);
        cupboardGroup.add(rightDoor);

        const handleHeight = 0.28;
        const handleOffsetX = doorWidth * 0.35;
        const handleY = doorY;
        const handleZ = frontZ + doorDepth / 2 + handleRadius * 0.8;

        const leftHandle = new THREE.Mesh(
          new THREE.CylinderGeometry(handleRadius, handleRadius, handleHeight, 14),
          trimMat,
        );
        leftHandle.rotation.z = Math.PI / 2;
        leftHandle.position.set(leftDoorX + handleOffsetX, handleY, handleZ);
        cupboardGroup.add(leftHandle);

        const rightHandle = new THREE.Mesh(
          new THREE.CylinderGeometry(handleRadius, handleRadius, handleHeight, 14),
          trimMat,
        );
        rightHandle.rotation.z = Math.PI / 2;
        rightHandle.position.set(rightDoorX - handleOffsetX, handleY, handleZ);
        cupboardGroup.add(rightHandle);

        cupboardGroup.position.set(
          xMeters + item.width / 2,
          0,
          zMeters + item.length / 2,
        );
        cupboardGroup.rotation.y = ((item.rotation || 0) * Math.PI) / 180;
        applyFurnitureMeta(cupboardGroup, item);
        scene.add(cupboardGroup);
        continue;
      }

      if (itemType === "lamp") {
        // Procedural lamp: base, stem, shade, and bulb.
        const lampGroup = new THREE.Group();
        const lampHeight = Math.max(0.5, Math.min(3, item.height ?? 1.5));
        const footprint = Math.max(0.12, Math.min(item.width, item.length));
        const baseRadius = footprint * 0.28;
        const baseHeight = 0.06;
        const stemRadius = Math.max(0.015, footprint * 0.08);
        const shadeHeight = Math.max(0.16, lampHeight * 0.22);
        const shadeBottomRadius = Math.max(0.09, footprint * 0.32);
        const shadeTopRadius = shadeBottomRadius * 0.62;
        const stemHeight = Math.max(0.2, lampHeight - baseHeight - shadeHeight);

        const baseColor = new THREE.Color(color);
        const frameColor = baseColor.clone().multiplyScalar(0.7);
        const shadeColor = baseColor.clone().multiplyScalar(1.08);
        const baseMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.45 });
        const stemMat = new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.2, roughness: 0.35 });
        const shadeMat = new THREE.MeshStandardMaterial({ color: shadeColor, roughness: 0.65 });
        const bulbMat = new THREE.MeshStandardMaterial({ color: "#fff6d6", emissive: "#ffd98a", emissiveIntensity: 0.25 });

        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(baseRadius, baseRadius * 0.92, baseHeight, 20),
          baseMat,
        );
        base.position.set(0, baseHeight / 2, 0);
        lampGroup.add(base);

        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(stemRadius, stemRadius, stemHeight, 14),
          stemMat,
        );
        stem.position.set(0, baseHeight + stemHeight / 2, 0);
        lampGroup.add(stem);

        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(shadeTopRadius, shadeBottomRadius, shadeHeight, 24, 1, true),
          shadeMat,
        );
        shade.position.set(0, baseHeight + stemHeight + shadeHeight / 2, 0);
        lampGroup.add(shade);

        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(0.035, shadeTopRadius * 0.45), 14, 12),
          bulbMat,
        );
        bulb.position.set(0, baseHeight + stemHeight + shadeHeight * 0.42, 0);
        lampGroup.add(bulb);

        lampGroup.position.set(
          xMeters + item.width / 2,
          0,
          zMeters + item.length / 2,
        );
        lampGroup.rotation.y = ((item.rotation || 0) * Math.PI) / 180;
        applyFurnitureMeta(lampGroup, item);
        scene.add(lampGroup);
        continue;
      }

      if (itemType === "bed") {
        // Procedural bed: frame, mattress, headboard, pillows, legs.
        const bedGroup = new THREE.Group();
        const frameHeight = 0.24;
        const mattressHeight = 0.22;
        const headboardHeight = 0.85;
        const headboardThickness = Math.max(0.08, item.length * 0.08);
        const legHeight = 0.12;
        const legThickness = Math.max(0.06, Math.min(0.1, Math.min(item.width, item.length) * 0.12));

        const baseColor = new THREE.Color(color);
        const frameColor = baseColor.clone().multiplyScalar(0.72);
        const mattressColor = baseColor.clone().multiplyScalar(1.16);
        const pillowColor = new THREE.Color("#f2efe9");

        const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.75 });
        const mattressMat = new THREE.MeshStandardMaterial({ color: mattressColor, roughness: 0.95 });
        const pillowMat = new THREE.MeshStandardMaterial({ color: pillowColor, roughness: 0.95 });

        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(item.width, frameHeight, item.length),
          frameMat,
        );
        frame.position.set(0, legHeight + frameHeight / 2, 0);
        bedGroup.add(frame);

        const mattress = new THREE.Mesh(
          new THREE.BoxGeometry(item.width * 0.94, mattressHeight, item.length * 0.92),
          mattressMat,
        );
        mattress.position.set(0, legHeight + frameHeight + mattressHeight / 2 - 0.02, 0);
        bedGroup.add(mattress);

        const headboard = new THREE.Mesh(
          new THREE.BoxGeometry(item.width * 0.96, headboardHeight, headboardThickness),
          frameMat,
        );
        headboard.position.set(
          0,
          legHeight + frameHeight + headboardHeight / 2 - 0.03,
          -item.length / 2 + headboardThickness / 2,
        );
        bedGroup.add(headboard);

        const pillowWidth = item.width * 0.38;
        const pillowDepth = item.length * 0.2;
        const pillowHeight = 0.08;
        const pillowY = legHeight + frameHeight + mattressHeight + pillowHeight / 2 - 0.05;
        const pillowZ = -item.length * 0.24;
        for (const px of [-item.width * 0.21, item.width * 0.21]) {
          const pillow = new THREE.Mesh(
            new THREE.BoxGeometry(pillowWidth, pillowHeight, pillowDepth),
            pillowMat,
          );
          pillow.position.set(px, pillowY, pillowZ);
          bedGroup.add(pillow);
        }

        const edgeX = item.width / 2 - legThickness / 2;
        const edgeZ = item.length / 2 - legThickness / 2;
        for (const lx of [-edgeX, edgeX]) {
          for (const lz of [-edgeZ, edgeZ]) {
            const leg = new THREE.Mesh(
              new THREE.BoxGeometry(legThickness, legHeight, legThickness),
              frameMat,
            );
            leg.position.set(lx, legHeight / 2, lz);
            bedGroup.add(leg);
          }
        }

        bedGroup.position.set(
          xMeters + item.width / 2,
          0,
          zMeters + item.length / 2,
        );
        bedGroup.rotation.y = ((item.rotation || 0) * Math.PI) / 180;
        applyFurnitureMeta(bedGroup, item);
        scene.add(bedGroup);
        continue;
      }

      // Generic fallback mesh for unsupported/unknown furniture types.
      const boxHeight = 0.8;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(item.width, boxHeight, item.length),
        new THREE.MeshStandardMaterial({ color }),
      );
      mesh.position.set(
        xMeters + item.width / 2,
        boxHeight / 2,
        zMeters + item.length / 2,
      );
      mesh.rotation.y = ((item.rotation || 0) * Math.PI) / 180;
      applyFurnitureMeta(mesh, item);
      scene.add(mesh);
    }

    // ---------- Resize handling ----------
    const onResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ---------- Animation loop ----------
    let rafId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };
    animate();

    // ---------- Cleanup on unmount/dependency change ----------
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("contextmenu", preventContextMenu);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      if (activeSelectionHelper) {
        scene.remove(activeSelectionHelper);
        activeSelectionHelper.geometry.dispose();
        if (Array.isArray(activeSelectionHelper.material)) {
          activeSelectionHelper.material.forEach((material: { dispose?: () => void }) =>
            material?.dispose?.(),
          );
        } else {
          activeSelectionHelper.material?.dispose?.();
        }
        activeSelectionHelper = null;
      }
      setSelectedFurnitureInfo(null);
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [furniture, room.cutLength, room.cutWidth, room.height, room.length, room.shape, room.width]);

  // Toggle left mouse behavior between rotate and pan.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.mouseButtons.LEFT = leftMode === "rotate" ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
  }, [leftMode]);

  // Zoom camera by scaling vector distance from controls target.
  const zoomBy = (factor: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const dir = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    camera.position.copy(controls.target.clone().add(dir));
    controls.update();
  };

  // Restore initial camera and controls target.
  const resetView = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const defaults = defaultViewRef.current;
    if (!camera || !controls || !defaults) return;
    camera.position.copy(defaults.position);
    controls.target.copy(defaults.target);
    controls.update();
  };

  return (
    // Full-page 3D viewer shell (public; auth only needed when fetching a saved design).
      <main className="h-screen overflow-hidden bg-[#d8cec4] text-[#372414]">
      <div className="h-full bg-[radial-gradient(circle_at_10%_10%,#f7ebdf_0%,#d8cec4_45%,#cab9ab_100%)]">
        <header className="border-b border-white/50 bg-white/60 px-4 py-2 text-[#4d3525] shadow-sm backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between">
            <div className="flex items-center gap-2">
              {isFromSavedDesign ? (
                <>
                  <Link
                    href={backToSavedHref}
                    className="rounded-lg border border-[#d4c8bc] bg-white px-3 py-1 text-sm font-medium text-[#4d3525] transition hover:bg-[#f7f3ef]"
                  >
                    Back to Saved Designs
                  </Link>
                  <Link
                    href={editIn2DHref}
                    className="rounded-lg border border-[#6b4934] bg-[linear-gradient(135deg,#4e3527_0%,#825a3c_100%)] px-3 py-1 text-sm font-medium text-[#f7ebdf]"
                  >
                    Edit in 2D
                  </Link>
                </>
              ) : (
                <Link
                  href={editIn2DHref}
                  className="rounded-lg border border-[#6b4934] bg-[linear-gradient(135deg,#4e3527_0%,#825a3c_100%)] px-3 py-1 text-base font-medium text-[#f7ebdf]"
                >
                  Back to 2D
                </Link>
              )}
            </div>
            <h1 className="text-3xl [font-family:Inter,sans-serif]">3D Design</h1>
            <div className="w-24" />
          </div>
        </header>

        <div className="mx-auto h-[calc(100vh-64px)] w-full max-w-[1280px] px-4 py-3">
          <section className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#b7a087] bg-[#e8ddd1] shadow-sm">
            <div ref={mountRef} className="min-h-0 flex-1" />
            {/* Room dimensions overlay */}
            <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg border border-[#d4c8bc] bg-white/80 px-2.5 py-1 text-xs text-[#4d3525] shadow-sm [font-family:Inter,sans-serif]">
              Room: {room.width.toFixed(1)}m x {room.length.toFixed(1)}m x {room.height.toFixed(1)}m
            </div>
            {selectedFurnitureInfo ? (
              // Selection info overlay (visible only when an object is selected).
              <div className="pointer-events-none absolute left-3 top-12 z-20 rounded-lg border border-[#d4c8bc] bg-white/80 px-2.5 py-1 text-xs text-[#4d3525] shadow-sm [font-family:Inter,sans-serif]">
                Selected: {selectedFurnitureInfo.name} ({selectedFurnitureInfo.width.toFixed(1)}m x {selectedFurnitureInfo.length.toFixed(1)}m)
              </div>
            ) : null}
            {/* Camera interaction toolbar */}
            <div className="pointer-events-auto absolute right-3 top-3 z-20 w-auto max-w-[calc(100%-24px)] rounded-xl border border-[#d4c8bc] bg-white/95 p-2 text-xs text-[#4d3525] shadow-md [font-family:Inter,sans-serif]">
              <div className="mb-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLeftMode("rotate")}
                  aria-pressed={leftMode === "rotate"}
                  className={`min-w-[74px] rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    leftMode === "rotate"
                      ? "border-[#6b4934] bg-[#efe4d8] text-[#3f2a1d]"
                      : "border-[#d4c8bc] bg-white text-[#4d3525] hover:bg-[#f8f4ef]"
                  }`}
                >
                  Rotate
                </button>
                <button
                  type="button"
                  onClick={() => setLeftMode("pan")}
                  aria-pressed={leftMode === "pan"}
                  className={`min-w-[74px] rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    leftMode === "pan"
                      ? "border-[#6b4934] bg-[#efe4d8] text-[#3f2a1d]"
                      : "border-[#d4c8bc] bg-white text-[#4d3525] hover:bg-[#f8f4ef]"
                  }`}
                >
                  Pan
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => zoomBy(0.9)}
                  className="rounded-lg border border-[#d4c8bc] bg-white px-2.5 py-1.5 text-xs font-medium transition hover:bg-[#f8f4ef]"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => zoomBy(1.1)}
                  className="rounded-lg border border-[#d4c8bc] bg-white px-2.5 py-1.5 text-xs font-medium transition hover:bg-[#f8f4ef]"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  className="rounded-lg border border-[#d4c8bc] bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-[#f8f4ef]"
                >
                  Reset
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[#6c5848]">
                Left drag: {leftMode} | Wheel: zoom | Right drag: pan
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

