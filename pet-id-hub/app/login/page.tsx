"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, siteUrl } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"signin" | "register" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ensureProfile(user: User, name?: string, usernameInput?: string) {
    try {
      const profileRef = doc(db, "profiles", user.uid);
      const snap = await getDoc(profileRef);
      if (!snap.exists()) {
        const fallbackName = name || user.displayName || user.email?.split("@")[0] || "Member";
        const fallbackUsername = usernameInput || fallbackName;
        await setDoc(profileRef, {
          fullName: fallbackName,
          username: fallbackUsername,
          city: null,
          phone: null,
          isAdmin: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("Could not ensure profile:", err);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === "register") {
        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await ensureProfile(res.user, fullName.trim(), username.trim());
      } else {
        const res = await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureProfile(res.user);
      }
      router.push("/dashboard");
    } catch (err: any) {
      let msg = err.message || "Failed to authenticate.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        msg = "Invalid email or password. Please check your details or create an account.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Please sign in instead.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters long.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      await ensureProfile(res.user);
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await sendSignInLinkToEmail(auth, email.trim(), {
        url: `${siteUrl}/auth/complete`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem("pawid_email_for_signin", email.trim());
      setSent(true);
    } catch (err: any) {
      setError(
        err.code === "auth/configuration-not-found"
          ? "Email link sign-in is not enabled for this Firebase project. Please use Password or Google sign in."
          : err.message || "Something went wrong sending the link."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card border-brand-100 shadow-lg shadow-brand-900/5">
        <p className="page-kicker mb-2">
          {authMode === "register" ? "Join PawID" : "Welcome back"}
        </p>
        <h1 className="section-heading text-[1.8rem] mb-2">
          {authMode === "register" ? "Create your account" : "Sign in to PawID"}
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          {authMode === "register"
            ? "Keep your pets, health logs, and community activity safely synced."
            : "Access your pets, QR tags, and history anytime."}
        </p>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 mb-5 text-sm">
          <button
            type="button"
            className={`pb-2 px-3 font-medium transition-colors ${
              authMode === "signin"
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-gray-400 hover:text-gray-700"
            }`}
            onClick={() => {
              setAuthMode("signin");
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`pb-2 px-3 font-medium transition-colors ${
              authMode === "register"
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-gray-400 hover:text-gray-700"
            }`}
            onClick={() => {
              setAuthMode("register");
              setError(null);
            }}
          >
            Register
          </button>
          <button
            type="button"
            className={`pb-2 px-3 font-medium transition-colors ${
              authMode === "magic"
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-gray-400 hover:text-gray-700"
            }`}
            onClick={() => {
              setAuthMode("magic");
              setError(null);
            }}
          >
            Magic Link
          </button>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full mb-4 flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-3 text-xs text-gray-400">or with email</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {authMode === "magic" ? (
          sent ? (
            <div className="bg-brand-50 text-brand-700 text-sm rounded-xl p-4">
              <p>
                Sign-in link requested for <strong>{email}</strong>. Check your inbox or spam.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => setSent(false)}
                >
                  Change email
                </button>
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => handleMagicLinkSubmit({ preventDefault() {} } as React.FormEvent)}
                >
                  Resend link
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
              <input
                type="email"
                required
                aria-label="Email address"
                placeholder="you@example.com"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p role="alert" className="text-alert-500 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {authMode === "register" && (
              <>
                <input
                  type="text"
                  required
                  aria-label="Username"
                  placeholder="Choose a username"
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  type="text"
                  required
                  aria-label="Full name"
                  placeholder="Your Name"
                  className="input-field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </>
            )}
            <input
              type="email"
              required
              aria-label="Email address"
              placeholder="you@example.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              aria-label="Password"
              placeholder="Password (min 6 characters)"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p role="alert" className="text-alert-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? "Processing..."
                : authMode === "register"
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
