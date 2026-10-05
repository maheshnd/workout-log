"use client";

import type { InstallPromptEvent } from "@/lib/pwa";

type Props = { installEvent: InstallPromptEvent | null; onDismiss: () => void };

export function InstallHint({ installEvent, onDismiss }: Props) {
  return (
    <div className="hint" role="note">
      <p>Add to Home Screen and always open Gym Log from the icon, so your log stays in one place.</p>
      <div className="btn-pair">
        <button type="button" className="ghost" onClick={onDismiss}>
          Got it
        </button>
        {installEvent && (
          <button
            type="button"
            className="primary"
            onClick={async () => {
              await installEvent.prompt().catch(() => {});
              onDismiss();
            }}
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
