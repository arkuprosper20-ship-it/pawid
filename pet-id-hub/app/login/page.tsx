"use client";

import { useState } from "react";
import { sendSignInLinkToEmail } from "firebase/auth";
import { auth, siteUrl } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await sendSignInLinkToEmail(auth, email, {
        url: `${siteUrl}/auth/complete`,
        handleCodeInApp: true,
      });
      // Save the email so /auth/complete can finish sign-in without
      // asking again (Firebase requires it to verify the link).
      window.localStorage.setItem("pawid_email_for_signin", email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong sending the link.");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="card">
        <h1 className="text-xl font-bold mb-1">Sign in to PawID</h1>
        <p className="text-sm text-gray-500 mb-6">
          No password needed — we'll email you a magic link.
        </p>

        {sent ? (
          <div className="bg-brand-50 text-brand-700 text-sm rounded-xl p-4">
            Check your inbox! Click the link we sent to <strong>{email}</strong>{" "}
            to finish signing in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-alert-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
