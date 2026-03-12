"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import profileIconImage from "@/images/Profile icon.png";
import { logout as apiLogout, clearToken, getToken } from "@/lib/api";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ProfileMenu() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  // Controls whether the dropdown is visible.
  const [open, setOpen] = useState(false);
  // Used to detect outside clicks and close the menu.
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close menu when clicking outside.
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    // Close menu on Escape key.
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const token = getToken();
      if (token) {
        await apiLogout(token);
      }
    } catch (err) {
      console.error("Logout API error", err);
    }
    try {
      window.localStorage.removeItem("furnivision_design");
      window.localStorage.removeItem("furnivision_saved_designs");
    } catch {
      // Ignore storage access errors and continue logout navigation.
    }
    clearToken();
    setOpen(false);
    router.push("/login");
  };

 return (
    // Profile trigger button + dropdown container.
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d8c6b6] bg-white px-4 py-2 text-[#5a3f2f] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <span className="text-xl [font-family:Inter,sans-serif]">
          {isLoading ? "" : user?.name || "User"}
        </span>
        <span className="relative h-10 w-10 overflow-hidden rounded-full border border-[#cfb8a5] bg-[#f2e6da]">
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt="Profile photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <Image src={profileIconImage} alt="Profile icon" fill className="object-cover" sizes="40px" />
          )}
        </span>
      </button>

      {open ? (
        // Dropdown panel with quick account actions.
        <div className="absolute right-0 top-full z-[80] mt-3 w-64 rounded-2xl border border-[#d8c6b6] bg-white p-3 text-[#4d3525] shadow-lg">
          <div className="absolute -top-2 right-10 h-4 w-4 rotate-45 border-l border-t border-[#d8c6b6] bg-white" />
          <div className="flex items-center gap-4 border-b border-[#d5c6b8] pb-3">
            <span className="relative h-10 w-10 overflow-hidden rounded-full border border-[#cfb8a5] bg-[#f2e6da]">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt="Profile photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image src={profileIconImage} alt="Profile icon" fill className="object-cover" sizes="40px" />
              )}
            </span>
            <span className="text-xl [font-family:Inter,sans-serif]">
              {isLoading ? "" : user?.name || "User"}
            </span>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-2 block w-full rounded-md px-2 py-2 text-left text-xl hover:bg-[#f3e7dc]"
          >
            My Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full rounded-md px-2 py-2 text-left text-xl hover:bg-[#f3e7dc]"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

