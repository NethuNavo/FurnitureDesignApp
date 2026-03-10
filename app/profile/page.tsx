"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState, useEffect } from "react";
import bedroomImage from "@/images/bedroom.jpg";
import profileIconImage from "@/images/Profile icon.png";
import { useAuth } from "@/lib/hooks/useAuth";
import { updateProfile, changePassword } from "@/lib/api";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRuleRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export default function ProfilePage() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const { user, token, isAuthenticated } = useAuth();
  const [userName, setUserName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileErrors, setProfileErrors] = useState<{ userName?: string; email?: string }>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // when auth user loads, populate fields
  useEffect(() => {
    if (user) {
      setUserName(user.name);
      setEmail(user.email);
    }
  }, [user]);
  const [passwordErrors, setPasswordErrors] = useState<{ currentPassword?: string; newPassword?: string }>({});
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const onProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { userName?: string; email?: string } = {};

    if (userName.trim().length < 2) {
      nextErrors.userName = "User name must be at least 2 characters.";
    }
    if (!emailRegex.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setProfileMessage(null);
      return;
    }

    if (!token) {
      setProfileMessage("Not logged in.");
      return;
    }

    const result = await updateProfile(token, {
      name: userName,
      email,
    });
    if (result.error) {
      setProfileMessage(result.error);
    } else {
      setProfileMessage("Profile updated successfully.");
    }
  };

  const onPasswordSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { currentPassword?: string; newPassword?: string } = {};

    if (!currentPassword.trim()) {
      nextErrors.currentPassword = "Current password is required.";
    }
    if (!newPassword.trim()) {
      nextErrors.newPassword = "New password is required.";
    } else if (!passwordRuleRegex.test(newPassword)) {
      nextErrors.newPassword =
        "Password must be 8+ chars with uppercase, lowercase, number and special character.";
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword = "New password must be different from current password.";
    }

    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setPasswordMessage(null);
      return;
    }

    if (!token) {
      setPasswordMessage("Not logged in.");
      return;
    }

    const result = await changePassword(token, currentPassword, newPassword);
    if (result.error) {
      setPasswordMessage(result.error);
    } else {
      setPasswordMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordMessage(null);
      }, 700);
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

        <div className="relative mx-auto flex min-h-screen w-full max-w-[900px] flex-col items-center justify-center px-4 py-8">
          <Link
            href="/dashboard"
            className="mb-4 self-start rounded-lg border border-[#d4c8bc] bg-white/90 px-3 py-1.5 text-sm text-[#4d3525] transition hover:bg-[#f7f3ef]"
          >
            {"<"} Back to Dashboard
          </Link>

          <section className="w-full rounded-2xl border border-[#c7b4a5] bg-[#f7ebdf]/80 p-5 shadow-sm backdrop-blur-sm md:p-7">
            <h1 className="text-center text-3xl font-semibold text-[#3f2b1f] md:text-4xl">My Profile</h1>
            <div className="mt-6 flex flex-col items-center">
              <div className="relative h-32 w-32 overflow-hidden rounded-full border border-[#b7a087] bg-[#e8ddd2]">
                <Image
                  src={profileIconImage}
                  alt="Profile placeholder"
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
              <button
                type="button"
                className="mt-3 rounded-lg border border-[#b7a087] bg-white px-4 py-1.5 text-sm text-[#4d3525] transition hover:bg-[#efe4d8]"
              >
                Add a New Image
              </button>
            </div>

            <form className="mx-auto mt-7 w-full max-w-[640px] space-y-4" onSubmit={onProfileSave}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#5a463a]">User Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  className="w-full rounded-xl border border-[#b7a087] bg-[#f7ebdf] px-4 py-2.5 text-xl outline-none"
                />
                {profileErrors.userName ? (
                  <p className="mt-1 text-xs text-[#b13c2f]">{profileErrors.userName}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#5a463a]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-[#b7a087] bg-[#f7ebdf] px-4 py-2.5 text-xl outline-none"
                />
                {profileErrors.email ? (
                  <p className="mt-1 text-xs text-[#b13c2f]">{profileErrors.email}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#5a463a]">Password</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    value="********"
                    readOnly
                    className="min-w-[220px] flex-1 rounded-xl border border-[#b7a087] bg-[#eee3d8] px-4 py-2.5 text-xl text-[#6b4e3a] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="rounded-xl border border-[#6b4934] bg-[linear-gradient(135deg,#5a3e2d_0%,#825a3c_100%)] px-4 py-2.5 text-sm font-medium text-[#f7ebdf] shadow-sm transition hover:brightness-105"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="submit"
                  className="rounded-xl border border-[#6b4934] bg-[linear-gradient(135deg,#4e3527_0%,#825a3c_100%)] px-8 py-2.5 text-lg font-medium text-[#f7ebdf] shadow-sm transition hover:brightness-105"
                >
                  Save Changes
                </button>
                {profileMessage ? (
                  <p className="mt-2 text-sm text-[#2f6b3f]">{profileMessage}</p>
                ) : null}
              </div>
            </form>
          </section>

          {isPasswordModalOpen ? (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1f140d]/45 p-4 backdrop-blur-[1px]">
              <div className="w-full max-w-lg rounded-2xl border border-[#c7b4a5] bg-[#f7ebdf] p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xl font-semibold text-[#3f2b1f]">Change Password</p>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="rounded-md border border-[#b7a087] bg-white px-2 py-1 text-sm text-[#4d3525] hover:bg-[#efe4d8]"
                  >
                    x
                  </button>
                </div>

                <form className="space-y-4" onSubmit={onPasswordSave}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#5a463a]">Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="w-full rounded-xl border border-[#b7a087] bg-[#f7ebdf] px-4 py-2.5 text-base outline-none"
                    />
                    {passwordErrors.currentPassword ? (
                      <p className="mt-1 text-xs text-[#b13c2f]">{passwordErrors.currentPassword}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#5a463a]">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full rounded-xl border border-[#b7a087] bg-[#f7ebdf] px-4 py-2.5 text-base outline-none"
                    />
                    {passwordErrors.newPassword ? (
                      <p className="mt-1 text-xs text-[#b13c2f]">{passwordErrors.newPassword}</p>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-[#d8cabc] bg-[#fffaf5] px-4 py-3">
                    <p className="text-sm font-medium text-[#4d3525]">Validation rules</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#6b4e3a]">
                      <li>At least 8 characters</li>
                      <li>Include at least one uppercase letter</li>
                      <li>Include at least one lowercase letter</li>
                      <li>Include at least one number</li>
                      <li>Include at least one special character</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl border border-[#6b4934] bg-[linear-gradient(135deg,#4e3527_0%,#825a3c_100%)] px-5 py-2.5 text-base font-medium text-[#f7ebdf] shadow-sm transition hover:brightness-105"
                  >
                    Save New Password
                  </button>
                  {passwordMessage ? (
                    <p className="text-center text-sm text-[#2f6b3f]">{passwordMessage}</p>
                  ) : null}
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
