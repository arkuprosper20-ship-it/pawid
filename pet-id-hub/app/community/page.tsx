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
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, toJsDate } from "@/lib/firebase";
import { CommunityPost, BroadcastAlert, Profile } from "@/types";
import { formatDistanceToNow } from "date-fns";

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([]);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [currentIsAdmin, setCurrentIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUid(u?.uid || null);
      if (u) {
        getDoc(doc(db, "profiles", u.uid)).then((snap) => {
          if (snap.exists()) {
            setCurrentIsAdmin((snap.data() as Profile).isAdmin === true);
          } else {
            setCurrentIsAdmin(false);
          }
        }).catch(() => setCurrentIsAdmin(false));
      } else {
        setCurrentIsAdmin(false);
      }
    });
    load();
    return () => unsub();
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
      let authorName: string | null = null;
      let authorUsername: string | null = null;
      let isAdmin = false;
      try {
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (profileSnap.exists()) {
          const p = profileSnap.data() as Profile;
          authorName = p.fullName || null;
          authorUsername = p.username || null;
          isAdmin = p.isAdmin === true;
        }
      } catch (profileErr) {
        console.warn("Could not fetch profile, using fallback:", profileErr);
      }

      await addDoc(collection(db, "communityPosts"), {
        authorId: user.uid,
        authorName,
        authorUsername,
        authorIsAdmin: isAdmin,
        petId: null,
        content: content.trim(),
        photoUrl: null,
        isFlagged: false,
        isRemoved: false,
        isEdited: false,
        editedAt: null,
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

  async function deletePost(post: CommunityPost) {
    if (!currentUid) return;
    const isOwner = post.authorId === currentUid;
    if (!isOwner && !currentIsAdmin) return;
    const ok = window.confirm("Delete this post? This cannot be undone.");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "communityPosts", post.id));
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err: any) {
      setReportStatus(err.message || "Could not delete this post.");
    }
  }

  function startEdit(post: CommunityPost) {
    setEditingId(post.id);
    setEditContent(post.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEdit(post: CommunityPost) {
    if (!currentUid) return;
    const isOwner = post.authorId === currentUid;
    if (!isOwner && !currentIsAdmin) return;
    const trimmed = editContent.trim();
    if (!trimmed) return;
    try {
      await updateDoc(doc(db, "communityPosts", post.id), {
        content: trimmed,
        isEdited: true,
        editedAt: serverTimestamp(),
      });
      setEditingId(null);
      setEditContent("");
      await load();
    } catch (err: any) {
      setReportStatus(err.message || "Could not save changes.");
    }
  }

  function displayAuthor(post: CommunityPost): string {
    if (post.authorIsAdmin) return "Management";
    if (post.authorUsername && post.authorUsername.trim()) return post.authorUsername;
    if (post.authorName && post.authorName.trim()) return post.authorName;
    return "PawID member";
  }

  function canModify(post: CommunityPost): boolean {
    if (!currentUid) return false;
    return post.authorId === currentUid || currentIsAdmin;
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
          {posts.map((post) => {
            const canAct = canModify(post);
            return (
              <div key={post.id} className="card">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium text-sm ${post.authorIsAdmin ? "text-brand-700" : ""}`}>
                    {displayAuthor(post)}
                    {post.authorIsAdmin && (
                      <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                        Management
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(toJsDate(post.createdAt))} ago
                    {post.isEdited && " (edited)"}
                  </span>
                </div>

                {editingId === post.id ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      className="input-field text-sm"
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(post)}
                        className="btn-primary text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                )}

                {post.isFlagged && !post.isRemoved && (
                  <p className="text-xs text-yellow-600 mt-2">⚑ Flagged for review</p>
                )}

                <div className="flex items-center gap-3 mt-2">
                  {!canAct && (
                    <button
                      onClick={() => flagPost(post.id)}
                      className="text-xs text-gray-300 hover:text-gray-500"
                    >
                      Report post
                    </button>
                  )}
                  {canAct && editingId !== post.id && (
                    <>
                      <button
                        onClick={() => startEdit(post)}
                        className="text-xs text-brand-600 hover:text-brand-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePost(post)}
                        className="text-xs text-alert-500 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {posts.length === 0 && (
            <p className="text-gray-400 text-center py-8">No posts yet — be the first!</p>
          )}
        </div>
      )}
    </div>
  );
}
