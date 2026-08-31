// Close a modal only on a genuine click that STARTED on the backdrop — not when
// the mouse is pressed inside a field (e.g. selecting text) and released on the
// backdrop. Only one modal is open at a time, so a module-level flag is enough.
let downOnBackdrop = false;

export const backdropHandlers = (onClose) => ({
  onMouseDown: (e) => { downOnBackdrop = e.target === e.currentTarget; },
  onClick: (e) => { if (e.target === e.currentTarget && downOnBackdrop) { downOnBackdrop = false; onClose && onClose(); } },
});
