"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { daysBetween, todayLocal, weekday } from "@/lib/dates";
import { exportBackup } from "@/lib/exportImport";
import { findExercise, getDay, REST_DAY_MESSAGE, REST_GUIDANCE } from "@/lib/plan";
import {
  isIOS,
  isStandalone,
  registerServiceWorker,
  requestPersist,
  type InstallPromptEvent,
} from "@/lib/pwa";
import {
  dismissInstallHint,
  getLastExport,
  getUnit,
  isInstallHintDismissed,
  loadStore,
  loadUi,
  removeSet,
  saveUi,
  setLastExport,
  setUnit,
  upsertSet,
  type SetEntry,
} from "@/lib/storage";
import { fromUnit, type Unit } from "@/lib/units";
import { DataSheet } from "./DataSheet";
import { DayTabs } from "./DayTabs";
import { ExerciseList } from "./ExerciseList";
import { ExerciseScreen } from "./ExerciseScreen";
import { InstallHint } from "./InstallHint";
import { UpdateBanner } from "./UpdateBanner";

type Ui = {
  date: string;
  view: "today" | "exercise";
  day: number | null; // null = Sunday, nothing selected
  exerciseId: string | null;
  drafts: Record<string, (SetEntry | null)[]>;
  extra: Record<string, boolean>;
};

function freshUi(today: string): Ui {
  const d = weekday(today);
  return { date: today, view: "today", day: d === 0 ? null : d, exerciseId: null, drafts: {}, extra: {} };
}

/** Restore saved UI only if it is from today and still points at something real. */
function restoreUi(saved: Ui | null, today: string): Ui {
  if (!saved || saved.date !== today) return freshUi(today);
  const day = saved.day !== null && getDay(saved.day) ? saved.day : null;
  const exOk = day !== null && saved.exerciseId !== null && !!findExercise(day, saved.exerciseId);
  return {
    date: today,
    view: saved.view === "exercise" && exOk ? "exercise" : "today",
    day,
    exerciseId: exOk ? saved.exerciseId : null,
    drafts: saved.drafts && typeof saved.drafts === "object" ? saved.drafts : {},
    extra: saved.extra && typeof saved.extra === "object" ? saved.extra : {},
  };
}

export default function GymApp() {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState("");
  const [ui, setUi] = useState<Ui | null>(null);
  const [, setVersion] = useState(0); // bump to re-read the store
  const [saveFailed, setSaveFailed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [lastExport, setLastExportState] = useState<string | null>(null);
  const [unit, setUnitState] = useState<Unit>("kg");
  const [showHint, setShowHint] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const todayRef = useRef("");

  // Everything that reads localStorage / Date / window happens after mount.
  useEffect(() => {
    const t = todayLocal();
    todayRef.current = t;
    loadStore();
    setToday(t);
    setUi(restoreUi(loadUi<Ui>(), t));
    setLastExportState(getLastExport());
    setUnitState(getUnit());
    setShowHint(!isStandalone() && !isInstallHintDismissed());
    setMounted(true);
    registerServiceWorker(() => setUpdateReady(true));

    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    // Day change: an app left open overnight must show the new day.
    const checkDay = () => {
      if (document.visibilityState === "hidden") return;
      const now = todayLocal();
      if (now !== todayRef.current) {
        todayRef.current = now;
        setToday(now);
        setUi(freshUi(now));
      }
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    document.addEventListener("visibilitychange", checkDay);
    window.addEventListener("focus", checkDay);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      document.removeEventListener("visibilitychange", checkDay);
      window.removeEventListener("focus", checkDay);
    };
  }, []);

  // Save UI state on every change so an OS kill puts me back on the same screen.
  useEffect(() => {
    if (ui) saveUi(ui);
  }, [ui]);

  const update = useCallback((patch: Partial<Ui>) => setUi((u) => (u ? { ...u, ...patch } : u)), []);

  const afterWrite = (ok: boolean) => {
    setSaveFailed(!ok);
    setVersion((v) => v + 1);
  };

  const doExport = async () => {
    const now = new Date();
    if (await exportBackup(loadStore().sessions, now, isIOS())) {
      setLastExport(now.toISOString());
      setLastExportState(now.toISOString());
    }
  };

  const errorBar = saveFailed && (
    <div className="bar bar-error" role="alert">
      <span>Couldn&apos;t save. Export a backup now.</span>
      <button type="button" className="bar-btn" onClick={doExport}>
        Export
      </button>
    </div>
  );

  if (!mounted || !ui) {
    return (
      <main className="app">
        <header className="app-header">
          <span className="brand">Gym Log</span>
        </header>
        <ul className="ex-list" />
      </main>
    );
  }

  const day = ui.day !== null ? getDay(ui.day) : undefined;
  const exercise = ui.view === "exercise" && ui.day !== null && ui.exerciseId ? findExercise(ui.day, ui.exerciseId) : undefined;

  if (exercise && day) {
    const id = exercise.id;
    return (
      <main className="app" data-type={day.type}>
        {errorBar}
        <ExerciseScreen
          key={id}
          exercise={exercise}
          today={today}
          unit={unit}
          draft={ui.drafts[id] ?? []}
          extra={!!ui.extra[id]}
          onDraft={(d) => update({ drafts: { ...ui.drafts, [id]: d } })}
          onAddSet={() => update({ extra: { ...ui.extra, [id]: true } })}
          onLog={(i, set) => {
            afterWrite(upsertSet(today, exercise, i, { weight: fromUnit(set.weight, unit), reps: set.reps }));
            requestPersist();
          }}
          onUndo={(i, set) => {
            // Keep the undone values in the row so nothing has to be re-entered.
            const d = [...(ui.drafts[id] ?? [])];
            d[i] = set;
            update({ drafts: { ...ui.drafts, [id]: d } });
            afterWrite(removeSet(today, id, i));
          }}
          onBack={() => update({ view: "today", exerciseId: null })}
        />
      </main>
    );
  }

  const sessionsCount = loadStore().sessions.length;
  const backupAge = lastExport ? daysBetween(todayLocal(new Date(lastExport)), today) : null;
  const nagBackup = sessionsCount > 0 && (backupAge === null || backupAge > 7);

  return (
    <main className="app" data-type={day?.type}>
      {errorBar}
      {updateReady && <UpdateBanner />}
      <header className="app-header">
        <span className="brand">Gym Log</span>
        <button type="button" className="ghost" onClick={() => setSheetOpen(true)}>
          Data
        </button>
      </header>

      <DayTabs selected={ui.day} onSelect={(d) => update({ day: d })} />

      {showHint && (
        <InstallHint
          installEvent={installEvent}
          onDismiss={() => {
            dismissInstallHint();
            setShowHint(false);
          }}
        />
      )}

      {day ? (
        <section className="screen">
          <h1 className="day-title">{day.title}</h1>
          <p className="muted rest-line">{REST_GUIDANCE}</p>
          <ExerciseList day={day} today={today} unit={unit} onOpen={(exId) => update({ view: "exercise", exerciseId: exId })} />
        </section>
      ) : (
        <section className="screen">
          <h1 className="day-title">Rest</h1>
          <p className="rest-msg">{REST_DAY_MESSAGE}</p>
        </section>
      )}

      {nagBackup && (
        <p className="backup-nag muted">
          Last backup: {backupAge === null ? "never" : `${backupAge} days ago`} —{" "}
          <button type="button" className="link-btn inline" onClick={doExport}>
            Export
          </button>
        </p>
      )}

      {sheetOpen && (
        <DataSheet
          lastExport={lastExport}
          unit={unit}
          onUnit={(u) => {
            setUnit(u);
            setUnitState(u);
            update({ drafts: {} }); // drafts were typed in the old unit
          }}
          onExport={doExport}
          onChanged={afterWrite}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </main>
  );
}
