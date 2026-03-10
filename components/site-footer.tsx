"use client";

import { useState } from "react";

// Content shown when users click each quick-link item.
const footerDetails = {
  "About Us": {
    title: "About FurniVision",
    description:
      "FurniVision helps users design rooms with practical 2D and 3D planning tools. You can set room dimensions, place furniture, and preview layouts before making real changes.",
  },
  FAQ: {
    title: "Frequently Asked Questions",
    description:
      "Q: Can I edit saved designs? A: Yes, open a saved design and continue from 2D or 3D view. Q: Can I change room size later? A: Yes, dimensions can be updated anytime in the editor.",
  },
  Support: {
    title: "Support",
    description:
      "Need help? Contact our support team at support@furnivision.com or call +1 (555) 210-7788. Support hours: Monday to Friday, 9:00 AM to 6:00 PM.",
  },
  "Privacy Policy": {
    title: "Privacy Policy",
    description:
      "We only collect the data needed to provide your design workspace and account features. Personal information is protected and never sold to third parties.",
  },
  Terms: {
    title: "Terms and Conditions",
    description:
      "By using FurniVision, you agree to use the platform responsibly and comply with all applicable laws. Misuse of the service may result in access restrictions.",
  },
} as const;

type FooterKey = keyof typeof footerDetails;

type SiteFooterProps = {
  // Optional class overrides so pages can control spacing/shape.
  className?: string;
};

export default function SiteFooter({ className = "" }: SiteFooterProps) {
  // Tracks which detail panel is open from quick links.
  const [activeFooterDetail, setActiveFooterDetail] = useState<FooterKey | null>(null);

  return (
    <>
      {/* Reusable footer layout shared across main pages. */}
      <footer
        className={`${className} border border-[#6d4f3b] bg-[linear-gradient(180deg,#7b5a44_0%,#5a3e2d_100%)] px-6 py-5 text-[#f7ebdf] shadow-md`}
      >
        <div className="mx-auto grid w-full max-w-[1400px] gap-6 md:grid-cols-3">
          <div>
            <h3 className="text-xl font-semibold [font-family:Inter,sans-serif]">
              FurniVision
            </h3>
            <p className="mt-2 text-sm text-[#efe4d8]">
              Plan your room in 2D and 3D with smart furniture layout tools.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium">Quick Links</h4>
            {/* Each link opens an informational modal (not external navigation). */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <button
                type="button"
                onClick={() => setActiveFooterDetail("About Us")}
                className="hover:underline"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => setActiveFooterDetail("FAQ")}
                className="hover:underline"
              >
                FAQ
              </button>
              <button
                type="button"
                onClick={() => setActiveFooterDetail("Support")}
                className="hover:underline"
              >
                Support
              </button>
              <button
                type="button"
                onClick={() => setActiveFooterDetail("Privacy Policy")}
                className="hover:underline"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setActiveFooterDetail("Terms")}
                className="hover:underline"
              >
                Terms
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium">Contact</h4>
            <div className="mt-2 space-y-1 text-sm text-[#efe4d8]">
              <p>Email: support@furnivision.com</p>
              <p>Phone: +1 (555) 210-7788</p>
              <p>Hours: Mon - Fri, 9:00 AM - 6:00 PM</p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-base">
              <span className="rounded border border-[#b7a087]/50 bg-[#372414]/35 px-3 py-1">f</span>
              <span className="rounded border border-[#b7a087]/50 bg-[#372414]/35 px-3 py-1">t</span>
              <span className="rounded border border-[#b7a087]/50 bg-[#372414]/35 px-3 py-1">yt</span>
            </div>
          </div>
        </div>
        <p className="mt-5 border-t border-[#b7a087]/30 pt-3 text-center text-sm text-[#efe4d8]">
          (c) 2026 FurniVision. All rights reserved.
        </p>
      </footer>

      {/* Modal with detailed info for the selected quick-link topic. */}
      {activeFooterDetail ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#1f140d]/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-2xl rounded-2xl border border-[#c7b4a5] bg-[#f7ebdf] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#d5c6b8] px-6 py-3">
              <h2 className="text-2xl [font-family:Inter,sans-serif]">
                {footerDetails[activeFooterDetail].title}
              </h2>
              <button
                type="button"
                onClick={() => setActiveFooterDetail(null)}
                className="text-3xl leading-none text-[#5a463a] hover:text-[#372414]"
                aria-label="Close footer details"
              >
                x
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-lg leading-relaxed text-[#4d3525]">
                {footerDetails[activeFooterDetail].description}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

