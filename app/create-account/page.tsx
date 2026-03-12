"use client";

// Next.js client page imports.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { register as apiRegister, saveToken } from "@/lib/api";

// Create Account screen for new users.
import Image from "next/image";
import logoImage from "@/images/logo.jpeg";
export default function CreateAccountPage() {
  // Router used for redirect after successful signup.
  const router = useRouter();
  // Local form and UI state for validation + password visibility.
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>(
    {}
  );

  // Handles form submit, validates fields, calls register API, and redirects on success.
  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Validate each field and collect errors before continuing.
    const nextErrors: { fullName?: string; email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    } else if (fullName.trim().length < 2) {
      nextErrors.fullName = "Full name must be at least 2 characters.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailRegex.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    // Call register API
    const result = await apiRegister(fullName, email, password);
    if (result.error) {
      // display server-side error on email field
      setErrors({ email: result.error });
      return;
    }

    // Save token and redirect
    saveToken(result.data!.token);
    router.push("/dashboard");
  };

  return (
    // Full-page centered create-account card.
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_15%_20%,#fffdf9_0%,#f3e8dc_42%,#d5b79b_74%,#a98568_100%)] px-5 py-10 md:py-0">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-white/55 bg-[linear-gradient(165deg,rgba(255,255,255,0.95)_0%,rgba(250,243,235,0.82)_100%)] p-7 shadow-[0_20px_50px_rgba(33,19,10,0.2)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10">
            <Image src={logoImage} alt="FurniVision logo" width={40} height={40} />
          </div>
          <div className="text-xl font-semibold tracking-wide text-[#2b2017]">FurniVision</div>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-[#2b2017]">Create Account</h1>
        <p className="mt-2 text-sm text-[#5d4939]">Set up your FurniVision account to get started.</p>

        {/* Account form with inline validation feedback. */}
        <form className="mt-8 space-y-5" onSubmit={handleCreateAccount} autoComplete="off">
          {/* Full name field */}
          <div>
            <label className="text-sm font-medium text-[#2b201a]">Full name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                if (errors.fullName) {
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                }
              }}
              className={`mt-2 w-full rounded-xl border bg-[#fcf4eb] px-4 py-3 text-sm text-[#2b201a] [caret-color:#2b201a] [-webkit-text-fill-color:#2b201a] placeholder:text-[#b9a796] [&::placeholder]:[-webkit-text-fill-color:#b9a796] outline-none transition focus:text-[#2b201a] focus:ring-2 ${
                errors.fullName
                  ? "border-[#b85f4c] focus:border-[#b85f4c] focus:ring-[#b85f4c]/20"
                  : "border-[#d9c8b6] focus:border-[#ab7b54] focus:ring-[#c79a75]/30"
              }`}
            />
            {errors.fullName ? <p className="mt-1 text-xs text-[#b85f4c]">{errors.fullName}</p> : null}
          </div>

          {/* Email field */}
          <div>
            <label className="text-sm font-medium text-[#2b201a]">E-mail address</label>
            <input
              type="email"
              autoComplete="off"
              placeholder="designer@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              className={`mt-2 w-full rounded-xl border bg-[#fcf4eb] px-4 py-3 text-sm text-[#2b201a] [caret-color:#2b201a] [-webkit-text-fill-color:#2b201a] placeholder:text-[#b9a796] [&::placeholder]:[-webkit-text-fill-color:#b9a796] outline-none transition focus:text-[#2b201a] focus:ring-2 ${
                errors.email
                  ? "border-[#b85f4c] focus:border-[#b85f4c] focus:ring-[#b85f4c]/20"
                  : "border-[#d9c8b6] focus:border-[#ab7b54] focus:ring-[#c79a75]/30"
              }`}
            />
            {errors.email ? <p className="mt-1 text-xs text-[#b85f4c]">{errors.email}</p> : null}
          </div>

          {/* Password field with show/hide toggle */}
          <div>
            <label className="text-sm font-medium text-[#2b201a]">Password</label>
            <div className="relative mt-2">
              {/* Toggle between hidden/visible password input. */}
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                className={`w-full rounded-xl border bg-[#fcf4eb] px-4 py-3 pr-16 text-sm text-[#2b201a] [caret-color:#2b201a] [-webkit-text-fill-color:#2b201a] placeholder:text-[#b9a796] [&::placeholder]:[-webkit-text-fill-color:#b9a796] outline-none transition focus:text-[#2b201a] focus:ring-2 ${
                  errors.password
                    ? "border-[#b85f4c] focus:border-[#b85f4c] focus:ring-[#b85f4c]/20"
                    : "border-[#d9c8b6] focus:border-[#ab7b54] focus:ring-[#c79a75]/30"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-[#5a463a] hover:bg-black/5"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password ? <p className="mt-1 text-xs text-[#b85f4c]">{errors.password}</p> : null}
          </div>

          {/* Primary submit action */}
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-[linear-gradient(145deg,#7f573b_0%,#5f3f2b_100%)] px-4 py-3 text-sm font-semibold text-[#fff8ef] shadow-lg shadow-[#5c3d29]/25 transition hover:brightness-110 active:scale-[0.99]"
          >
            Create account
          </button>
        </form>

        {/* Secondary path for existing users. */}
        <p className="mt-4 text-center text-sm text-[#5a463a]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#6b4934] underline underline-offset-4 hover:text-[#2b201a]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
