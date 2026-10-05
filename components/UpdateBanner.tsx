"use client";

import { applyUpdate } from "@/lib/pwa";

export function UpdateBanner() {
  return (
    <div className="bar" role="status">
      <span>New version ready</span>
      <button type="button" className="bar-btn" onClick={applyUpdate}>
        Update
      </button>
    </div>
  );
}
