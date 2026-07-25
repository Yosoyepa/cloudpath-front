import type {
  PersistedSession,
  SessionState,
} from "./sessionTypes";

export const STORAGE_KEY = "cloudpath.session.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPersistedSession(value: unknown): value is PersistedSession {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return false;
  }
  if (!Array.isArray(value.attempts)) {
    return false;
  }
  if (
    value.lastAdaptation !== undefined &&
    value.lastAdaptation !== null &&
    !isRecord(value.lastAdaptation)
  ) {
    return false;
  }
  if (value.profile !== null && !isRecord(value.profile)) {
    return false;
  }
  if (value.route !== null) {
    if (!isRecord(value.route)) {
      return false;
    }
    if (
      typeof value.route.routeVersion !== "number" ||
      !Array.isArray(value.route.nodes)
    ) {
      return false;
    }
  }
  return true;
}

export function toPersistedSession(state: SessionState): PersistedSession {
  return {
    schemaVersion: 1,
    profile: state.profile,
    route: state.route,
    attempts: state.attempts,
    lastAdaptation: state.lastAdaptation,
  };
}

export function readPersistedSession(
  storage: Pick<Storage, "getItem">,
): PersistedSession | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isPersistedSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writePersistedSession(
  storage: Pick<Storage, "setItem">,
  state: SessionState,
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(toPersistedSession(state)));
  } catch {
    // Storage can be unavailable in private modes; the in-memory session stays valid.
  }
}
