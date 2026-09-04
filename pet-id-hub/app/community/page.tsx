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
    try {
      const postsQ = query(
        collection(db, "communityPosts"),
        where("isRemoved", "==", false),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const postsSnap = await getDocs(postsQ);
      const postsList = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityPost));
      setPosts(postsList);

      const alertsQ = query(
        collection(db, "broadcastAlerts"),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const alertsSnap = await getDocs(alertsQ);
      setAlerts(alertsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BroadcastAlert)));
    } catch (err) {
      console.error("Failed to load community feed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    setReportStatus(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setReportStatus("You must be signed in to post.");
        setPosting(false);
        return;
      }
      let authorName = user.email || "Pet Parent";
      try {
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (profileSnap.exists()) authorName = profileSnap.data().fullName || authorName;
      } catch (profileErr) {
        console.warn("Could not fetch profile name, using fallback:", profileErr);
      }

      await addDoc(collection(db, "communityPosts"), {
        authorId: user.uid,
        authorName,
        petId: null,
        content: content.trim(),
        photoUrl: null,
        isFlagged: false,
        isRemoved: false,
        createdAt: serverTimestamp(),
      });
      setContent("");
      await load();
    } catch (err: any) {
      console.error("Failed to post:", err);
      setReportStatus(err.message || "Could not publish post. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function flagPost(postId: string) {
    try {
      await updateDoc(doc(db, "communityPosts", postId), { isFlagged: true });
      setReportStatus("Post reported for review.");
      await load();
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
              <strong>Alert:</strong> {a.message}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submitPost} className="card mb-6 space-y-3">
        <textarea
          required
          aria-label="Post content"
          placeholder="Share an update with the community..."
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
