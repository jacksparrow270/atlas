"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { defaults } from "@/lib/engine";
import { payloadSchemas, preferencesSchema } from "@/lib/schema";
import type {
  Preferences,
  StudyRecord,
  Payload,
  RecordKind,
} from "@/lib/schema";
type Store = {
  preferences: Preferences;
  records: StudyRecord[];
  preview: boolean;
  userId: string;
  loading: boolean;
  error: string;
  notice: string;
  save: <K extends RecordKind>(
    kind: K,
    id: string,
    data: Payload[K],
  ) => Promise<boolean>;
  remove: (kind: RecordKind, id: string) => Promise<boolean>;
  setPreferences: (p: Preferences) => Promise<boolean>;
  refresh: () => Promise<void>;
  importBackup: (data: unknown) => Promise<boolean>;
  get: <K extends RecordKind>(kind: K, id: string) => Payload[K] | undefined;
};
const Context = createContext<Store | null>(null);
export function Provider({
  children,
  preview,
  userId,
}: {
  children: ReactNode;
  preview: boolean;
  userId: string;
}) {
  const [preferences, updatePreferences] = useState(defaults);
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    if (preview) return;
    try {
      setError("");
      const res = await fetch("/api/state", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      if (data.preferences) updatePreferences(data.preferences);
      setRecords(data.records);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }, [preview]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const f = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [refresh]);
  async function send(body: unknown) {
    setError("");
    if (preview) {
      setNotice("Preview only · changes last until this page is reloaded.");
      return true;
    }
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      setNotice("Saved to your academy");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      return false;
    }
  }
  async function save<K extends RecordKind>(
    kind: K,
    id: string,
    data: Payload[K],
  ) {
    const parsed = payloadSchemas[kind].safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return false;
    }
    if (!(await send({ kind, id, data }))) return false;
    setRecords((old) => [
      { kind, id, data, updated_at: new Date().toISOString() },
      ...old.filter((r) => r.kind !== kind || r.id !== id),
    ]);
    return true;
  }
  async function remove(kind: RecordKind, id: string) {
    if (!(await send({ action: "delete", kind, id, data: {} }))) return false;
    setRecords((old) => old.filter((r) => r.kind !== kind || r.id !== id));
    return true;
  }
  async function setPreferences(p: Preferences) {
    const parsed = preferencesSchema.safeParse(p);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return false;
    }
    if (!(await send({ action: "preferences", data: p }))) return false;
    updatePreferences(p);
    return true;
  }
  async function importBackup(data: unknown) {
    if (preview) {
      setError("Sign in to import a backup into your account.");
      return false;
    }
    if (!(await send({ action: "import", data }))) return false;
    await refresh();
    return true;
  }
  function get<K extends RecordKind>(kind: K, id: string) {
    return records.find((r) => r.kind === kind && r.id === id)?.data as
      Payload[K] | undefined;
  }
  return (
    <Context.Provider
      value={{
        preferences,
        records,
        preview,
        userId,
        loading,
        error,
        notice,
        save,
        remove,
        setPreferences,
        refresh,
        importBackup,
        get,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAcademy() {
  const value = useContext(Context);
  if (!value) throw Error("Missing Academy provider");
  return value;
}
