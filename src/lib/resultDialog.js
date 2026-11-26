export const INITIAL_CAPTURE_RESULT_DIALOG = Object.freeze({ open: false, sessionId: null });

export function captureResultDialogReducer(state = INITIAL_CAPTURE_RESULT_DIALOG, action) {
  if (action.type === "session-completed") {
    if (!action.completed || action.sessionId == null || state.sessionId === action.sessionId) return state;
    return { open: true, sessionId: action.sessionId };
  }
  if (action.type === "reopen") return state.sessionId == null || state.open ? state : { ...state, open: true };
  if (action.type === "close") return state.open ? { ...state, open: false } : state;
  if (action.type === "reset") return INITIAL_CAPTURE_RESULT_DIALOG;
  return state;
}
