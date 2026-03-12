"use client";

// Login page imports.
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import vaseImage from "@/images/3d-vase.png";
import logoImage from "@/images/logo.jpeg";
import { login as apiLogin, saveToken } from "@/lib/api";

// Main sign-in page component.
export default function LoginPage() {
  // Router used after successful login.
  const router = useRouter();
  // Local UI/form state.
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Form submit handler with client-side validation.
  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Basic client-side validation before API call.
    const nextErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailRegex.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    // Call login API
    const result = await apiLogin(email, password);
    if (result.error) {
      // Show error message on form
      setErrors({ email: result.error });
      return;
    }

    // Save JWT token and redirect
    saveToken(result.data!.token);
    router.push("/dashboard");
  };

  return (
    // Full-page login scene with decorative gradients/shapes.
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#fffdf9_0%,#f3e8dc_42%,#d5b79b_74%,#a98568_100%)]">
      <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-[#fff8ee]/65 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[#f0dcc6]/45 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#d8b89b]/30 blur-3xl" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10 md:px-8">
        {/* Two-panel card: left = form, right = feature branding. */}
        <div className="grid w-full overflow-visible rounded-3xl border border-0 bg-white/30 shadow-[0_30px_80px_rgba(33,19,10,0.25)] backdrop-blur-md md:grid-cols-[1.22fr_0.78fr]">
          {/* Left panel: login form and actions. */}
          <div className="overflow-hidden rounded-l-3xl bg-[linear-gradient(165deg,rgba(252, 252, 251, 0.95)_0%,rgba(254, 243, 231, 0.82)_100%)] p-7 md:p-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10">
                <Image src={logoImage} alt="FurniVision logo" width={40} height={40} />
              </div>
              <div className="text-xl font-semibold tracking-wide text-[#2f2218]">FurniVision</div>
            </div>

            <h1 className="mt-8 text-4xl font-semibold tracking-tight text-[#2b1608] md:text-5xl">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-[#5d4939]">
              Sign in to continue designing your spaces in 2D and 3D.
            </p>

            {/* Sign-in form */}
            <form className="mt-8 space-y-5" onSubmit={handleSignIn} autoComplete="off">
              {/* Email input */}
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
                  className={`mt-2 w-full rounded-xl border bg-[#fcf4eb] px-4 py-3 text-sm text-[#2b201a] [caret-color:#2b201a] [-webkit-text-fill-color:#2b201a] placeholder:text-[#c5b8ab] [&::placeholder]:[-webkit-text-fill-color:#c5b8ab] outline-none transition focus:ring-2 ${
                    errors.email
                      ? "border-[#b85f4c] focus:border-[#b85f4c] focus:ring-[#b85f4c]/20"
                      : "border-[#d9c8b6] focus:border-[#ab7b54] focus:ring-[#c79a75]/30"
                  }`}
                />
                {errors.email ? <p className="mt-1 text-xs text-[#b85f4c]">{errors.email}</p> : null}
              </div>

              {/* Password input + show/hide control */}
              <div>
                <label className="text-sm font-medium text-[#2b201a]">Password</label>
                <div className="relative mt-2">
                  {/* Password visibility toggle. */}
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    className={`w-full rounded-xl border bg-[#fcf4eb] px-4 py-3 pr-14 text-sm text-[#2b201a] [caret-color:#2b201a] [-webkit-text-fill-color:#2b201a] placeholder:text-[#c5b8ab] [&::placeholder]:[-webkit-text-fill-color:#c5b8ab] outline-none transition focus:ring-2 ${
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
                {errors.password ? (
                  <p className="mt-1 text-xs text-[#b85f4c]">{errors.password}</p>
                ) : null}
              </div>

              {/* Secondary options */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-[#5a463a]">
                  <input type="checkbox" className="h-4 w-4 accent-[#a97852]" />
                  Remember me
                </label>

                <a
                  href="#"
                  className="text-sm text-[#5a463a] underline-offset-4 hover:text-[#2b201a] hover:underline"
                >
                  Forgot Password?
                </a>
              </div>

              {/* Primary login action */}
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-[linear-gradient(145deg,#7f573b_0%,#5f3f2b_100%)] px-4 py-3 text-sm font-semibold text-[#fff8ef] shadow-lg shadow-[#5c3d29]/25 transition hover:brightness-110 active:scale-[0.99]"
              >
                Sign in
              </button>
              {/* Link to create-account route */}
              <p className="pt-2 text-center text-sm text-[#5a463a]">
                No account?{" "}
                <Link
                  href="/create-account"
                  className="font-medium text-[#6b4934] underline underline-offset-4 hover:text-[#2b201a]"
                >
                  Create new account
                </Link>
              </p>
            </form>
          </div>

          {/* Right panel: marketing text + decorative vase image. */}
          <div className="relative hidden min-h-full overflow-visible rounded-r-3xl md:block">
            <div className="absolute inset-0 rounded-r-3xl bg-[linear-gradient(155deg,#8a6447_0%,#73523a_45%,#5f432f_100%)]" />
            <div className="absolute inset-0 rounded-r-3xl bg-[radial-gradient(circle_at_70%_22%,rgba(63, 44, 4, 0.34),transparent_45%)]" />
            <div className="relative z-10 flex h-full items-start justify-start p-8 pt-16 pr-28 text-left text-[#f7ede4]">
              <div className="max-w-[290px] space-y-10">
                <h2 className="text-4xl leading-[1.05] [font-family:Inter,sans-serif]">
                  Professional
                  <br />
                  Design Tools
                </h2>
                <p className="whitespace-nowrap text-[15px] leading-7 text-[#f1dfcf]">
                  Access powerful 2D and 3D visualization features 
                  <br />
                  to create stunning interior designs with ease.
                </p>
                <div className="space-y-10 text-[18px] text-[#f5e8dd]">
                  <p className="flex items-center gap-3">
                    <span className="inline-grid h-7 w-7 place-items-center rounded-sm border border-[#d8b89b] text-base">
                      ✓
                    </span>
                    Real-time 3D visualization
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="inline-grid h-7 w-7 place-items-center rounded-sm border border-[#d8b89b] text-base">
                      ✓
                    </span>
                    Custom room dimensions
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="inline-grid h-7 w-7 place-items-center rounded-sm border border-[#d8b89b] text-base">
                      ✓
                    </span>
                    Color and shading controls
                  </p>
                </div>
              </div>
            </div>
            <Image
              src={vaseImage}
              alt="3D Vase"
              width={360}
              height={560}
              className="pointer-events-none absolute -bottom-8 -right-20 z-20 h-auto w-[200px] object-contain drop-shadow-[0_28px_28px_rgba(36,21,12,0.46)] md:w-[270px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

