"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white text-[#372414] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#e7e0d8] bg-[#fcfbfa] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold [font-family:Inter,sans-serif]">Page not found</h1>
        <p className="mt-2 text-sm text-[#6b4e3a]">
          The page you’re looking for doesn’t exist.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-[#6b4934] bg-[linear-gradient(135deg,#5a3e2d_0%,#825a3c_100%)] px-4 py-2 text-sm font-medium text-[#f7ebdf]"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/new-design"
            className="rounded-lg border border-[#d4c8bc] bg-white px-4 py-2 text-sm font-medium text-[#4d3525] hover:bg-[#f5eee8]"
          >
            New Design
          </Link>
        </div>
      </div>
    </main>
  );
}

