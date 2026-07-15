"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Lock, Loader2, Mail, ShieldCheck } from "lucide-react";

type FieldErrors = {
  email?: string;
  password?: string;
};

function validate(email: string, password: string) {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = "Email wajib diisi.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Format email belum valid.";
  }

  if (!password) {
    errors.password = "Password wajib diisi.";
  }

  return errors;
}

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const year = useMemo(() => new Date().getFullYear(), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    setLoading(false);

    if (result?.ok) {
      router.push("/");
      router.refresh();
    } else {
      setAuthError("Email atau password salah, silakan coba lagi.");
    }
  }

  return (
    <div className="relative -mx-4 -my-6 min-h-[calc(100vh-73px)] overflow-hidden bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-50">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#F97362]/20 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-[#7C3AED]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <section className="relative z-10 hidden min-h-[calc(100vh-73px)] items-center py-10 lg:flex">
        <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/35 bg-slate-950 p-10 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,98,0.45),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(124,58,237,0.42),transparent_34%),linear-gradient(135deg,#0f172a,#111827)]" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="relative">
            <div className="inline-flex rounded-3xl bg-white p-3 shadow-xl">
              <Image src="/logo.svg" alt="AutoPost" width={224} height={67} priority className="h-16 w-auto" />
            </div>
            <h1 className="mt-12 max-w-xl text-5xl font-black leading-tight tracking-tight">
              Otomasi publish konten Instagram tanpa ribet.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/78">
              Kelola jadwal, status publish, retry, dan koneksi Meta dari satu dashboard yang fokus untuk workflow kreator dan tim sosial media.
            </p>
            <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
              {["Schedule", "Publish", "Track"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-bold">{item}</p>
                  <div className="mt-3 h-1.5 rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#F97362] to-[#7C3AED]" style={{ width: item === "Schedule" ? "82%" : item === "Publish" ? "68%" : "76%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 flex min-h-[calc(100vh-120px)] items-center justify-center py-10 lg:min-h-[calc(100vh-73px)]">
        <div className="w-full max-w-md animate-[loginCard_420ms_ease-out]">
          <div className="mb-8 text-center lg:hidden">
            <Image src="/logo.svg" alt="AutoPost" width={192} height={58} priority className="mx-auto h-14 w-auto" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">Otomasi publish konten Instagram tanpa ribet.</p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-2xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-black/30 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97362] to-[#7C3AED] text-white shadow-lg">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Admin Login</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Masuk untuk mengelola post.</p>
              </div>
            </div>

            {authError ? (
              <div className="mt-6 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200" role="alert">
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <span>{authError}</span>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    className={`w-full rounded-2xl border bg-white py-3 pl-11 pr-4 text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white ${
                      fieldErrors.email
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100 dark:focus:ring-rose-950"
                        : "border-slate-200 focus:border-[#7C3AED] focus:ring-violet-100 dark:border-slate-700 dark:focus:ring-violet-950"
                    }`}
                    placeholder="admin@autopost.com"
                  />
                </div>
                {fieldErrors.email ? (
                  <p id="email-error" className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-300">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    className={`w-full rounded-2xl border bg-white py-3 pl-11 pr-12 text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white ${
                      fieldErrors.password
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100 dark:focus:ring-rose-950"
                        : "border-slate-200 focus:border-[#7C3AED] focus:ring-violet-100 dark:border-slate-700 dark:focus:ring-violet-950"
                    }`}
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p id="password-error" className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-300">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <input
                    name="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED] dark:border-slate-700 dark:bg-slate-950"
                  />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97362] to-[#7C3AED] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:pointer-events-none disabled:opacity-70 dark:focus:ring-violet-950"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">AutoPost © {year}</p>
        </div>
      </section>
    </div>
  );
}
