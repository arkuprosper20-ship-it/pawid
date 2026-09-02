"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, toJsDate } from "@/lib/firebase";
import { CommunityPost, BroadcastAlert } from "@/types";
import { formatDistanceToNow } from "date-fns";

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([]);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const postsQ = query(
      collection(db, "communityPosts"),
      where("isRemoved", "==", false),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const postsSnap = await getDocs(postsQ);
    setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommunityPost));

    const alertsQ = query(
      collection(db, "broadcastAlerts"),
      orderBy("createdAt", "desc"),
      limit(3)
    );
    const alertsSnap = await getDocs(alertsQ);
    setAlerts(alertsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BroadcastAlert));

    setLoading(false);
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "/login";
      return;
    }

    // Firestore has no joins, so pull the display name once and store it
    // directly on the post (denormalized) rather than looking it up per-post.
    const profileSnap = await getDoc(doc(db, "profiles", user.uid));
    const authorName = profileSnap.exists() ? profileSnap.data().fullName : null;

    await addDoc(collection(db, "communityPosts"), {
      authorId: user.uid,
      authorName: authorName || user.email,
      petId: null,
      content,
      photoUrl: null,
      isFlagged: false,
      isRemoved: false,
      createdAt: serverTimestamp(),
    });
    setContent("");
    setPosting(false);
    load();
  }

  async function flagPost(postId: string) {
    setReportStatus(null);
    try {
      await updateDoc(doc(db, "communityPosts", postId), { isFlagged: true });
      setReportStatus("Thanks — this post has been reported and flagged for review.");
      load();
    } catch (err: any) {
      setReportStatus(err.message || "Could not report this post. Try again.");
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Community Feed</h1>

      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((a) => (
            <div key={a.id} className="bg-alert-500 text-white text-sm rounded-xl p-3">
              🚨 {a.message}
              <span className="block text-xs opacity-80 mt-0.5">
                {formatDistanceToNow(toJsDate(a.createdAt))} ago
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submitPost} className="card mb-6">
        <textarea
          required
          aria-label="Community post content"
          placeholder="Share an update, ask a question..."
          className="input-field text-sm"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button type="submit" disabled={posting} className="btn-primary text-sm mt-2">
          {posting ? "Posting..." : "Post"}
        </button>
      </form>

      {reportStatus && (
        <p role="status" className="text-sm text-brand-700 mb-4">{reportStatus}</p>
      )}

      {loading ? (
        <p className="text-gray-400">Loading feed...</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="card">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">
                  {post.authorName || "PawID member"}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(toJsDate(post.createdAt))} ago
                </span>
              </div>
              <p className="text-sm text-gray-700">{post.content}</p>
              {post.isFlagged && (
                <p className="text-xs text-yellow-600 mt-2">⚑ Flagged for review</p>
              )}
              <button
                onClick={() => flagPost(post.id)}
                className="text-xs text-gray-300 hover:text-gray-500 mt-2"
              >
                Report post
              </button>
            </div>
          ))}
          {posts.length === 0 && (
            <p className="text-gray-400 text-center py-8">No posts yet — be the first!</p>
          )}
        </div>
      )}
    </div>
  );
}
