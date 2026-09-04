"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { HealthLog } from "@/types";
import { format, isBefore, addDays } from "date-fns";
import { logActivity } from "@/lib/activityLog";

export default function HealthLogPanel({ petId }: { petId: string }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [logType, setLogType] = useState<HealthLog["logType"]>("vaccination");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    loadLogs();
  }, [petId]);

  async function loadLogs() {
    const q = query(
      collection(db, "healthLogs"),
      where("petId", "==", petId),
      orderBy("loggedDate", "desc")
    );
    const snap = await getDocs(q);
    setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HealthLog));
  }

  async function addLog(e: React.FormEvent) {
    e.preventDefault();
    if (!label && logType !== "weight") return;
    const docRef = await addDoc(collection(db, "healthLogs"), {
      petId,
      logType,
      label: label || "Weight check-in",
      value,
      dueDate: dueDate || null,
      loggedDate: new Date().toISOString().slice(0, 10),
      createdAt: serverTimestamp(),
    });

    await logActivity({
      userId: (await getDoc(doc(db, "pets", petId))).data()?.ownerId || "unknown",
      action: "health_log_added",
      petId,
      metadata: { logType, label: label || "Weight check-in" },
    });

    setLabel("");
    setValue("");
    setDueDate("");
    loadLogs();
  }

  const upcomingReminders = logs.filter(
    (l) =>
      l.dueDate &&
      isBefore(new Date(l.dueDate), addDays(new Date(), 14)) &&
      !isBefore(new Date(l.dueDate), new Date())
  );

  return (
    <div className="card">
      <h3 className="font-semibold mb-3">Health &amp; Wellness Log</h3>

      {upcomingReminders.length > 0 && (
        <div className="bg-yellow-50 text-yellow-800 text-sm rounded-lg p-3 mb-4">
          ⏰ {upcomingReminders.length} upcoming reminder
          {upcomingReminders.length > 1 ? "s" : ""} in the next 14 days:{" "}
          {upcomingReminders.map((r) => r.label).join(", ")}
        </div>
      )}

      <form onSubmit={addLog} className="grid grid-cols-2 gap-2 mb-4">
        <select
          className="input-field text-sm col-span-2"
          value={logType}
          onChange={(e) => setLogType(e.target.value as HealthLog["logType"])}
        >
          <option value="vaccination">Vaccination</option>
          <option value="weight">Weight</option>
          <option value="medication">Medication</option>
        </select>
        <input
          className="input-field text-sm col-span-2"
          placeholder={logType === "weight" ? "Note (optional)" : "Label (e.g. Rabies)"}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="input-field text-sm"
          placeholder={logType === "weight" ? "Weight (kg)" : "Dosage / detail"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <input
          type="date"
          className="input-field text-sm"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          title="Due date (for reminders)"
        />
        <button type="submit" className="btn-primary text-sm col-span-2">
          Add entry
        </button>
      </form>

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {logs.length === 0 && (
          <p className="text-sm text-gray-400">No entries yet.</p>
        )}
        {logs.map((l) => (
          <div
            key={l.id}
            className="flex justify-between text-sm border-b border-gray-100 pb-1.5"
          >
            <div>
              <span className="font-medium">{l.label}</span>{" "}
              <span className="text-gray-400">({l.logType})</span>
              {l.value && <span className="text-gray-500"> — {l.value}</span>}
            </div>
            <span className="text-gray-400">
              {l.dueDate
                ? `due ${format(new Date(l.dueDate), "MMM d")}`
                : format(new Date(l.loggedDate), "MMM d")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
