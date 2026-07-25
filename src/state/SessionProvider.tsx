import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import {
  readPersistedSession,
  writePersistedSession,
} from "./persistence";
import { sessionReducer } from "./sessionReducer";
import {
  initialSessionState,
  type SessionAction,
  type SessionState,
} from "./sessionTypes";

interface SessionContextValue {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function restoreSession(initialState: SessionState): SessionState {
  const restored = readPersistedSession(window.localStorage);
  return restored
    ? sessionReducer(initialState, {
        type: "session/restored",
        payload: restored,
      })
    : initialState;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(
    sessionReducer,
    initialSessionState,
    restoreSession,
  );

  useEffect(() => {
    writePersistedSession(window.localStorage, state);
  }, [state.profile, state.route, state.attempts, state.lastAdaptation]);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      dispatch,
      reset: () => dispatch({ type: "session/reset" }),
    }),
    [state],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return value;
}
