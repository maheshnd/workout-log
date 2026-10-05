"use client";

import { useEffect, useRef, useState } from "react";
import { formatDay, todayLocal } from "@/lib/dates";
import { mergeSessions, parseImport } from "@/lib/exportImport";
import { clearAll, loadStore, replaceStore, type Session } from "@/lib/storage";

type Props = {
  lastExport: string | null;
  onExport: () => void;
  /** Called after the store changed; `ok` is false if the write failed. */
  onChanged: (ok: boolean) => void;
  onClose: () => void;
};

type Mode =
  | { kind: "idle"; message?: string }
  | { kind: "confirm-import"; sessions: Session[] }
  | { kind: "confirm-delete"; typed: string };

export function DataSheet({ lastExport, onExport, onChanged, onClose }: Props) {
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const count = loadStore().sessions.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    const result = parseImport(await file.text());
    if (fileRef.current) fileRef.current.value = "";
    setMode(result.ok ? { kind: "confirm-import", sessions: result.sessions } : { kind: "idle", message: result.error });
  };

  const doImport = (sessions: Session[]) => {
    const ok = replaceStore({ version: 1, sessions: mergeSessions(loadStore().sessions, sessions) });
    onChanged(ok);
    setMode({ kind: "idle", message: ok ? `Imported ${sessions.length} sessions.` : "Couldn't save the import." });
  };

  const doDelete = () => {
    const ok = clearAll();
    onChanged(ok);
    setMode({ kind: "idle", message: ok ? "All data deleted." : "Couldn't delete." });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="sheet-title">Data</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="muted">
          <span className="num">{count}</span> sessions stored · Last export:{" "}
          {lastExport ? formatDay(todayLocal(new Date(lastExport))) : "never"}
        </p>

        {mode.kind === "idle" && mode.message && (
          <p className="sheet-msg" role="status">
            {mode.message}
          </p>
        )}

        {mode.kind === "confirm-import" ? (
          <div className="confirm">
            <p>
              Import {mode.sessions.length} sessions? Sessions on the same date for the same exercise will be replaced
              by the file.
            </p>
            <div className="btn-pair">
              <button type="button" className="ghost" onClick={() => setMode({ kind: "idle" })}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={() => doImport(mode.sessions)}>
                Import
              </button>
            </div>
          </div>
        ) : mode.kind === "confirm-delete" ? (
          <div className="confirm">
            <label htmlFor="delete-confirm">
              Type <strong>DELETE</strong> to remove every logged set. This can&apos;t be undone.
            </label>
            <input
              id="delete-confirm"
              className="text-input"
              autoComplete="off"
              autoCapitalize="characters"
              value={mode.typed}
              onChange={(e) => setMode({ kind: "confirm-delete", typed: e.target.value })}
            />
            <div className="btn-pair">
              <button type="button" className="ghost" onClick={() => setMode({ kind: "idle" })}>
                Cancel
              </button>
              <button type="button" className="danger" disabled={mode.typed !== "DELETE"} onClick={doDelete}>
                Delete all
              </button>
            </div>
          </div>
        ) : (
          <div className="sheet-actions">
            <button type="button" className="primary" onClick={onExport}>
              Export backup
            </button>
            <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
              Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <button type="button" className="danger-ghost" onClick={() => setMode({ kind: "confirm-delete", typed: "" })}>
              Delete all data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
