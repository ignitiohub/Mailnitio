"use client";

import { useEffect } from "react";
import { captureUtm } from "@/lib/utm";

/** Records campaign parameters from the landing URL so demo requests can be attributed. */
export function UtmCapture() {
  useEffect(() => {
    captureUtm(window.location.search);
  }, []);
  return null;
}
