import type { TwoFactorAccount } from '../shared/types';

let toastContainer: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (toastContainer) return toastContainer;

  toastContainer = document.createElement('div');
  toastContainer.id = '2fa-manager-toast-container';
  const shadow = toastContainer.attachShadow({ mode: 'closed' });

  // Inject styles into shadow DOM
  const style = document.createElement('style');
  style.textContent = getToastStyles();
  shadow.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.id = 'toast-wrapper';
  shadow.appendChild(wrapper);

  document.body.appendChild(toastContainer);
  return toastContainer;
}

function getToastStyles(): string {
  return `
    #toast-wrapper {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .toast {
      background: #111827;
      border: 1px solid #374151;
      border-radius: 12px;
      padding: 16px;
      color: #f9fafb;
      width: 320px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.4);
      animation: slideIn 0.3s ease-out;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .toast-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toast-icon {
      width: 32px;
      height: 32px;
      background: #059669;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .toast-icon svg {
      width: 18px;
      height: 18px;
      fill: white;
    }
    .toast-title {
      font-size: 14px;
      font-weight: 600;
      color: #f9fafb;
    }
    .toast-subtitle {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 2px;
    }
    .toast-body {
      font-size: 13px;
      color: #d1d5db;
    }
    .toast-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .btn {
      padding: 6px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
    }
    .btn-save {
      background: #059669;
      color: white;
    }
    .btn-save:hover {
      background: #047857;
    }
    .btn-dismiss {
      background: #374151;
      color: #d1d5db;
    }
    .btn-dismiss:hover {
      background: #4b5563;
    }
    .toast-info {
      background: #1f2937;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      color: #9ca3af;
    }
    .toast-info strong {
      color: #e5e7eb;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
}

export function showToast(account: Partial<TwoFactorAccount>): Promise<boolean> {
  return new Promise((resolve) => {
    const container = ensureContainer();
    const wrapper = container.shadowRoot!.getElementById('toast-wrapper')!;

    const toast = document.createElement('div');
    toast.className = 'toast';

    const issuer = account.issuer || 'Unknown';
    const label = account.label || '';

    toast.innerHTML = `
      <div class="toast-header">
        <div class="toast-icon">
          <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 16l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg>
        </div>
        <div>
          <div class="toast-title">2FA Code Detected</div>
          <div class="toast-subtitle">Found on this page</div>
        </div>
      </div>
      <div class="toast-info">
        <strong>${issuer}</strong>${label ? ` — ${label}` : ''}
      </div>
      <div class="toast-actions">
        <button class="btn btn-dismiss" data-action="dismiss">Dismiss</button>
        <button class="btn btn-save" data-action="save">Save to Vault</button>
      </div>
    `;

    // Auto-dismiss after 10s
    const autoDismiss = setTimeout(() => {
      dismissToast(toast, wrapper);
      resolve(false);
    }, 10000);

    toast.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (action === 'save') {
        clearTimeout(autoDismiss);
        dismissToast(toast, wrapper);
        resolve(true);
      } else if (action === 'dismiss') {
        clearTimeout(autoDismiss);
        dismissToast(toast, wrapper);
        resolve(false);
      }
    });

    wrapper.appendChild(toast);
  });
}

export function showNoQRToast(): void {
  const container = ensureContainer();
  const wrapper = container.shadowRoot!.getElementById('toast-wrapper')!;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-icon" style="background: #6b7280;">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="white"/></svg>
      </div>
      <div>
        <div class="toast-title">No QR Codes Found</div>
        <div class="toast-subtitle">No 2FA QR codes detected on this page</div>
      </div>
    </div>
  `;

  wrapper.appendChild(toast);
  setTimeout(() => dismissToast(toast, wrapper), 3000);
}

function dismissToast(toast: HTMLElement, wrapper: HTMLElement): void {
  toast.style.animation = 'slideOut 0.3s ease-in forwards';
  setTimeout(() => {
    if (wrapper.contains(toast)) {
      wrapper.removeChild(toast);
    }
  }, 300);
}
