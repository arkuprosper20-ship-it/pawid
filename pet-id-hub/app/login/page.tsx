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
      setError(
        err.code === "auth/configuration-not-found"
          ? "Email link sign-in is not enabled for this Firebase project. Enable Authentication, then the Email link provider in Firebase Console."
          : err.message || "Something went wrong sending the link."
      );
    }
    setLoading(false);
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="card border-brand-100 shadow-lg shadow-brand-900/5">
        <p className="page-kicker mb-2">Welcome back</p>
        <h1 className="section-heading text-[1.8rem] mb-2">Sign in to PawID</h1>
        <p className="text-sm text-gray-500 mb-6">
          No password needed — we'll email you a magic link.
        </p>

        {sent ? (
          <div className="bg-brand-50 text-brand-700 text-sm rounded-xl p-4">
            <p>
              Sign-in link requested for <strong>{email}</strong>. Check your
              inbox, then check Spam, Junk, or Promotions for an email from
              Firebase. You can also search your mailbox for “PawID” or
              “Firebase”. When you find it, click the link on this device.
            </p>
            <p className="mt-3 text-xs text-brand-700/80">
              Still not there after a few minutes? Use <strong>Resend link</strong>
              or try another email address.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => setSent(false)}
              >
                Use another email
              </button>
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => handleSubmit({ preventDefault() {} } as React.FormEvent)}
              >
                Resend link
              </button>
            </div>
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
