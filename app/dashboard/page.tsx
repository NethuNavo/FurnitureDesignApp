"use client";

// Dashboard page imports.
import Link from "next/link";
import ProfileMenu from "@/components/profile-menu";
import SiteFooter from "@/components/site-footer";
import bedroomImage from "@/images/bedroom.jpg";
import { useAuth } from "@/lib/hooks/useAuth";
import { useEffect } from "react";

// Main Dashboard page with hero + quick start guidance.
export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // redirect to login when not authenticated
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    // Page shell + global typography.
    <main className="min-h-screen overflow-y-auto bg-[#f6f2ed] text-[#372414] [font-family:Inter,sans-serif]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_12%_10%,#fffdfa_0%,#f6f2ed_42%,#efe6dc_100%)]">
        <div className="w-full px-0">
          <div className="flex min-h-screen flex-col">
            {/* Sticky top navigation bar */}
            <header className="fixed inset-x-0 top-0 z-50 w-full rounded-none border border-[#e8e2da] border-x-0 border-t-0 bg-white/80 text-[#4d3525] shadow-[0_1px_6px_rgba(31,31,31,0.05)] backdrop-blur-md">
              <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
                {/* Brand */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#b7a087] bg-[#825a3c] text-sm font-semibold text-[#f7ebdf]">
                    FV
                  </div>
                  <p className="text-xl font-semibold [font-family:Inter,sans-serif]">
                    FurniVision
                  </p>
                </div>

                {/* Primary app navigation links */}
                <nav className="order-3 flex w-full items-center justify-center gap-[50px] text-lg text-[#4d3525] md:order-none md:w-auto">
                  <Link
                    href="/dashboard"
                    className="border-b-2 border-[#4d3525] pb-1 font-medium [font-family:Inter,sans-serif]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/new-design"
                    className="border-b-2 border-transparent pb-1 [font-family:Inter,sans-serif]"
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

                {/* Profile dropdown/menu */}
                <ProfileMenu />
              </div>
            </header>
            {/* Spacer for fixed header height */}
            <div className="h-[78px]" />

            {/* Hero section with blurred bedroom background */}
            <section className="relative min-h-[calc(100vh-78px)] overflow-hidden border border-[#e3d6c9] border-x-0 border-b-0">
              {/* Background image layer */}
              <div
                className="absolute inset-0 scale-110 bg-cover bg-center blur-[0.5px]"
                style={{ backgroundImage: `url(${bedroomImage.src})` }}
              />
              {/* Soft gradient overlay for readability */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,253,250,0.92)_0%,rgba(249,244,238,0.9)_58%,rgba(244,235,224,0.9)_100%)]" />
              <div className="relative mx-auto w-full max-w-[1100px] px-6 py-12 text-center md:px-8 md:py-14">
                <div className="mx-auto">
                  {/* Welcome + hero text */}
                  <p className="mb-3 text-lg font-semibold text-[#5a3f2e] md:text-2xl">
                    Welcome, {user?.name || 'Designer'}
                  </p>
                  <h1 className="text-3xl font-semibold leading-tight text-[#3f2b1f] md:text-4xl">
                    Design Your Dream Space
                  </h1>
                  <p className="mt-6 text-xl text-[#6b4e3a] md:text-2xl">
                    Create beautiful interiors in 2D and 3D
                  </p>

                  {/* Main call-to-action buttons */}
                  <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
                    <Link
                      href="/new-design"
                      className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[#6b4934] bg-[linear-gradient(135deg,#6a4b36_0%,#8b6448_100%)] px-6 text-[17px] font-medium text-[#fdf8f2] shadow-sm transition hover:opacity-95"
                    >
                      + Create New Design
                    </Link>
                    <Link
                      href="/saved-designs"
                      className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[#d7c4b2] bg-[#fffdfa] px-6 text-[17px] font-medium text-[#4d3525] transition hover:bg-[#f7efe5]"
                    >
                      Open Existing Designs
                    </Link>
                  </div>

                  {/* "How it works" cards */}
                  <div className="mx-auto mt-16 w-full max-w-6xl md:mt-20">
                    <h2 className="text-lg font-semibold text-[#4d3525] md:text-xl">
                      How it works
                    </h2>
                    <div className="mx-auto mt-8 grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* Step 1 */}
                      <article className="w-full rounded-2xl border border-[#e2d3c5] bg-white/75 p-4 text-center shadow-[0_5px_12px_rgba(31,31,31,0.05)] backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-[#cfb8a4] hover:bg-white/90 hover:shadow-[0_10px_22px_rgba(31,31,31,0.12)]">
                        <div className="mb-2 flex items-center justify-center">
                          <span className="rounded-md bg-[#efe2d4] px-2 py-0.5 text-xs font-semibold text-[#6b4934]">01</span>
                        </div>
                        <h3 className="text-base font-semibold text-[#3f2b1f]">Create Room</h3>
                        <p className="mt-1 text-sm text-[#5f4737]">Enter dimensions, select shape and color scheme.</p>
                      </article>

                      {/* Step 2 */}
                      <article className="w-full rounded-2xl border border-[#e2d3c5] bg-white/75 p-4 text-center shadow-[0_5px_12px_rgba(31,31,31,0.05)] backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-[#cfb8a4] hover:bg-white/90 hover:shadow-[0_10px_22px_rgba(31,31,31,0.12)]">
                        <div className="mb-2 flex items-center justify-center">
                          <span className="rounded-md bg-[#efe2d4] px-2 py-0.5 text-xs font-semibold text-[#6b4934]">02</span>
                        </div>
                        <h3 className="text-base font-semibold text-[#3f2b1f]">Arrange in 2D</h3>
                        <p className="mt-1 text-sm text-[#5f4737]">Drag and drop furniture, resize and rotate items.</p>
                      </article>

                      {/* Step 3 */}
                      <article className="w-full rounded-2xl border border-[#e2d3c5] bg-white/75 p-4 text-center shadow-[0_5px_12px_rgba(31,31,31,0.05)] backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-[#cfb8a4] hover:bg-white/90 hover:shadow-[0_10px_22px_rgba(31,31,31,0.12)]">
                        <div className="mb-2 flex items-center justify-center">
                          <span className="rounded-md bg-[#efe2d4] px-2 py-0.5 text-xs font-semibold text-[#6b4934]">03</span>
                        </div>
                        <h3 className="text-base font-semibold text-[#3f2b1f]">Preview in 3D</h3>
                        <p className="mt-1 text-sm text-[#5f4737]">Explore the 3D view and save your design.</p>
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Global footer */}
          <SiteFooter />
        </div>
      </div>
    </main>
  );
}

