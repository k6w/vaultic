/**
 * Copy text to the clipboard and, if `clearSeconds` > 0, schedule clearing it
 * afterwards — but only if the clipboard still holds the copied value (so we
 * never wipe something the user copied later). Best-effort: only runs while the
 * surface stays open.
 */
export async function copyWithClear(text: string, clearSeconds = 0): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (clearSeconds <= 0) return;
  window.setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === text) await navigator.clipboard.writeText('');
    } catch {
      // readText may be blocked without focus — clear unconditionally as a fallback.
      try {
        await navigator.clipboard.writeText('');
      } catch {
        /* give up quietly */
      }
    }
  }, clearSeconds * 1000);
}
