"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import bedroomImage from "@/images/bedroom.jpg";
import { useAuth } from "@/lib/hooks/useAuth";
import { changePassword } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSavePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Not logged in.");
      return;
    }

    const result = await changePassword(token, currentPassword, newPassword);
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => router.push("/profile"), 1000);
    }
  };

  return (
    <main className="min-h-screen bg-[#d8cec4] text-[#372414]">
      <div className="relative min-h-screen overflow-hidden bg-[#d8cec4]">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center blur-[0.5px]"
          style={{ backgroundImage: `url(${bedroomImage.src})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(252,248,243,0.94)_0%,rgba(243,231,218,0.9)_55%,rgba(234,216,200,0.88)_100%)]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-[760px] items-center justify-center px-4 py-8">
          <section className="w-full rounded-2xl border border-[#c7b4a5] bg-[#f7ebdf]/85 p-6 shadow-sm backdrop-blur-sm md:p-8">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h1 className="text-2xl font-semibold text-[#3f2b1f] md:text-3xl">Change Password</h1>
              <Link
                href="/profile"
                className="rounded-lg border border-[#d4c8bc] bg-white px-3 py-1.5 text-sm text-[#4d3525] transition hover:bg-[#f7f3ef]"
              >
                Back
              </Link>
            </div>

            <form className="space-y-4" onSubmit={handleSavePassword}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#5a463a]">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-[#b7a087] bg-[#f7ebdf] px-4 py-2.5 text-base outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#5a463a]">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full rounded-xl border border-[#b7a087] bg-[#f7ebdf] px-4 py-2.5 text-base outline-none"
                />
              </div>

              <div className="rounded-xl border border-[#d8cabc] bg-[#fffaf5] px-4 py-3">
                <p className="text-sm font-medium text-[#4d3525]">Validation rules</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#6b4e3a]">
                  <li>At least 8 characters</li>
                </ul>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl border border-[#6b4934] bg-[linear-gradient(135deg,#4e3527_0%,#825a3c_100%)] px-5 py-2.5 text-base font-medium text-[#f7ebdf] shadow-sm transition hover:brightness-105"
              >
                Save New Password
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
