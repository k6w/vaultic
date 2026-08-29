const SCRIPT_ID = 'vaultic-approved-sites';

/** Keep the persistent helper limited to origins the user granted explicitly. */
export async function syncPageIntegration(): Promise<void> {
  if (!chrome.scripting?.registerContentScripts) return;
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  } catch {
    // No prior registration.
  }

  const permissions = await chrome.permissions.getAll();
  const matches = (permissions.origins ?? []).filter(
    (origin) => origin.startsWith('https://') && !origin.includes('api.mail.tm'),
  );
  if (!matches.length) return;

  await chrome.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    matches,
    js: ['content/index.js'],
    runAt: 'document_idle',
    persistAcrossSessions: true,
  }]);
}

export function watchPageIntegrationPermissions(): void {
  chrome.permissions.onAdded.addListener(() => void syncPageIntegration());
  chrome.permissions.onRemoved.addListener(() => void syncPageIntegration());
}
