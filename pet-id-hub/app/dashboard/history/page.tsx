"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, toJsDate } from "@/lib/firebase";
import { getUserActivityLogs } from "@/lib/activityLog";
import { ActivityLog } from "@/types";

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  sign_in: { label: "Signed in", icon: "🔑" },
  sign_out: { label: "Signed out", icon: "🚪" },
  pet_created: { label: "Created a pet", icon: "🐾" },
  pet_claimed: { label: "Claimed a pet", icon: "✅" },
  pet_lost_mode_enabled: { label: "Reported pet as lost", icon: "🚨" },
  pet_lost_mode_disabled: { label: "Marked pet as found", icon: "🎉" },
  health_log_added: { label: "Added health log", icon: "💊" },
  badge_toggled: { label: "Updated badge", icon: "🏅" },
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      loadLogs(user.uid);
    });
    return () => unsubscribe();
  }, []);

  async function loadLogs(uid: string) {
    const data = await getUserActivityLogs(uid);
    setLogs(data);
    setLoading(false);
  }

  function formatTime(ts: string) {
    const d = toJsDate(ts);
    if (!d) return "Just now";
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Activity History</h1>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading history...</p>
      ) : logs.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-4" aria-hidden="true">📋</div>
          <h2 className="text-xl font-semibold mb-2">No activity yet</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Your sign-ins, pet updates, and health logs will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const info = ACTION_LABELS[log.action] || { label: log.action, icon: "📌" };
            return (
              <div key={log.id} className="card flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{info.label}</p>
                  {log.petId && (
                    <p className="text-xs text-gray-500">Pet ID: {log.petId}</p>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-xs text-gray-400">
                      {Object.entries(log.metadata)
                        .filter(([, v]) => v !== null && v !== undefined && v !== "")
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(log.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
