"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false
    });

    if (result?.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Login gagal. Periksa email dan password.");
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-stone-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input name="email" type="email" placeholder="Email" required className="w-full rounded-md border px-3 py-2" />
        <input name="password" type="password" placeholder="Password" required className="w-full rounded-md border px-3 py-2" />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="w-full rounded-md bg-moss px-4 py-2 font-medium text-white">Login</button>
      </form>
    </div>
  );
}
