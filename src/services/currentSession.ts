/**
 * Tiny shared session helpers (Milestone 12).
 *
 * These two things used to live inside DiagnosticSessionScreen / SessionList.
 * That created an eager import chain — Home imported `isUnfinished` from
 * SessionList, which imported the session-id key from DiagnosticSessionScreen,
 * which imports the diagnosis modules and therefore the whole ~570 KB DTC
 * knowledge base. Home is the landing screen, so that pulled the entire
 * database into the initial download and defeated route-level code splitting.
 *
 * Keeping them in their own dependency-free module lets Home import what it
 * needs without dragging any screen (or data) along with it.
 */
import type { DiagnosticSession } from "@/types/session";

/** localStorage key holding the id of the session the screen should load. */
export const CURRENT_SESSION_ID_KEY = "mt.demoSessionId.v1";

/** Sessions the mechanic still has work to do on. */
export function isUnfinished(s: DiagnosticSession): boolean {
  return s.status === "active" || s.status === "paused";
}
