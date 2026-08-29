/** Copy a secret and clear it later only when the clipboard is still unchanged. */
export async function copyWithClear(text: string, clearSeconds = 0): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (clearSeconds <= 0) return;

  window.setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === text) await navigator.clipboard.writeText('');
    } catch {
      // Never erase the clipboard when equality cannot be checked safely.
    }
  }, clearSeconds * 1000);
}
