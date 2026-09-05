"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { auth, db, toJsDate } from "@/lib/firebase";
import { CommunityPost, BroadcastAlert, Profile } from "@/types";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 10;

export default function CommunityPage() {
  const [pages, setPages] = useState<CommunityPost[][]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([]);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [currentIsAdmin, setCurrentIsAdmin] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [nearbyOnly, setNearbyOnly] = useState(false);

  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUid(u?.uid || null);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "profiles", u.uid));
          if (snap.exists()) {
            const p = snap.data() as Profile;
            setCurrentIsAdmin(p.isAdmin === true);
            setCurrentCity(p.city || null);
          } else {
            setCurrentIsAdmin(false);
            setCurrentCity(null);
          }
        } catch {
          setCurrentIsAdmin(false);
          setCurrentCity(null);
        }
      } else {
        setCurrentIsAdmin(false);
        setCurrentCity(null);
      }
    });
    return () => unsub();
  }, []);

  // Realtime broadcast alerts (top of page)
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "broadcastAlerts"), orderBy("createdAt", "desc"), limit(5)),
      (snap) => setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BroadcastAlert))),
      () => {}
    );
    return () => unsub();
  }, []);

  // First page + realtime prepend on new posts
  useEffect(() => {
    const q = query(
      collection(db, "communityPosts"),
      where("isRemoved", "==", false),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityPost));
      setPages([docs]);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setCursor(lastDocRef.current);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setInitialLoading(false);
    }, (err) => {
      console.error("Feed listener error:", err);
      setInitialLoading(false);
    });

    return () => unsub();
  }, []);

  async function loadMore() {
    if (!cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "communityPosts"),
        where("isRemoved", "==", false),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const newPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityPost));
      setPages((prev) => [...prev, newPosts]);
      const last = snap.docs[snap.docs.length - 1];
      setCursor(last ?? null);
      lastDocRef.current = last ?? null;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more failed:", err);
    } finally {
      setLoadingMore(false);
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
      let authorCity: string | null = null;
      try {
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (profileSnap.exists()) {
          const p = profileSnap.data() as Profile;
          authorName = p.fullName || null;
          authorUsername = p.username || null;
          isAdmin = p.isAdmin === true;
          authorCity = p.city || null;
        }
      } catch (profileErr) {
        console.warn("Could not fetch profile, using fallback:", profileErr);
      }

      await addDoc(collection(db, "communityPosts"), {
        authorId: user.uid,
        authorName,
        authorUsername,
        authorIsAdmin: isAdmin,
        authorCity,
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
    } catch (err: any) {
      setReportStatus(err.message || "Could not report this post. Try again.");
    }
  }

  async function deletePost(post: CommunityPost) {
    if (!currentUid) return;
    const isOwner = post.authorId === currentUid;
    if (!isOwner && !currentIsAdmin) {
      setReportStatus("You can only delete your own posts.");
      return;
    }
    const ok = window.confirm("Delete this post? This cannot be undone.");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "communityPosts", post.id));
      setReportStatus("Post deleted.");
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

  const allPosts = pages.flat();
  const visiblePosts = nearbyOnly && currentCity
    ? allPosts.filter((p) => p.authorCity && p.authorCity.toLowerCase() === currentCity.toLowerCase())
    : allPosts;

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
        <div className="flex items-center justify-between">
          <button type="submit" disabled={posting} className="btn-primary text-sm">
            {posting ? "Posting..." : "Post"}
          </button>
          {currentCity && (
            <label className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={nearbyOnly}
                onChange={(e) => setNearbyOnly(e.target.checked)}
                className="accent-brand-600"
              />
              Nearby ({currentCity})
            </label>
          )}
        </div>
      </form>

      {reportStatus && (
        <p role="status" className="text-sm text-brand-700 mb-4">{reportStatus}</p>
      )}

      {initialLoading ? (
        <p className="text-gray-400">Loading feed...</p>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => {
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
                    {post.authorCity && (
                      <span className="ml-2 text-xs text-gray-400">📍 {post.authorCity}</span>
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
          {visiblePosts.length === 0 && (
            <p className="text-gray-400 text-center py-8">
              {nearbyOnly ? "No posts nearby yet." : "No posts yet — be the first!"}
            </p>
          )}

          {!nearbyOnly && hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-secondary text-sm"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
