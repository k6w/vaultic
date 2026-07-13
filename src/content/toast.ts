import type { TwoFactorAccount } from '../shared/types';

let shadowRoot: ShadowRoot | null = null;
let toastWrapper: HTMLElement | null = null;

function ensureWrapper(): HTMLElement {
  if (toastWrapper && shadowRoot) return toastWrapper;

  const container = document.createElement('div');
  container.id = '2fa-manager-toast-container';
  shadowRoot = container.attachShadow({ mode: 'closed' });

  // Inject styles into shadow DOM
  const style = document.createElement('style');
  style.textContent = getToastStyles();
  shadowRoot.appendChild(style);

  toastWrapper = document.createElement('div');
  toastWrapper.id = 'toast-wrapper';
  shadowRoot.appendChild(toastWrapper);

  document.body.appendChild(container);
  return toastWrapper;
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
      background: #151a23;
      border: 1px solid #262e3b;
      border-radius: 18px;
      padding: 16px;
      color: #eaeef5;
      width: 320px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4);
      animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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
      width: 34px;
      height: 34px;
      background: #34e0a1;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .toast-icon svg {
      width: 18px;
      height: 18px;
      fill: #04140e;
    }
    .toast-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .toast-title {
      font-size: 14px;
      font-weight: 600;
      color: #eaeef5;
    }
    .toast-subtitle {
      font-size: 12px;
      color: #9ba6b4;
      margin-top: 2px;
    }
    .toast-body {
      font-size: 13px;
      color: #c3ccd8;
    }
    .toast-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .btn {
      padding: 7px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: background 0.15s, filter 0.15s;
    }
    .btn-save {
      background: #34e0a1;
      color: #04140e;
    }
    .btn-save:hover {
      filter: brightness(1.08);
    }
    .btn-dismiss {
      background: #1c232f;
      color: #c3ccd8;
    }
    .btn-dismiss:hover {
      background: #202836;
    }
    .toast-info {
      background: #1c232f;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 12px;
      color: #9ba6b4;
    }
    .toast-info strong {
      color: #eaeef5;
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

export function showToast(account: Partial<TwoFactorAccount>, domain?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const wrapper = ensureWrapper();

    const toast = document.createElement('div');
    toast.className = 'toast';

    const issuer = account.issuer || 'Unknown';
    const label = account.label || '';
    const shieldSvg = '<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 16l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg>';
    const subtitleText = domain ? `Found on ${domain}` : 'Found on this page';

    toast.innerHTML = `
      <div class="toast-header">
        <div class="toast-icon">
          ${account.icon ? `<img src="${account.icon}" alt="" />` : shieldSvg}
        </div>
        <div>
          <div class="toast-title">2FA code detected</div>
          <div class="toast-subtitle">${subtitleText}</div>
        </div>
      </div>
      <div class="toast-info">
        <strong>${issuer}</strong>${label ? ` &mdash; ${label}` : ''}
      </div>
      <div class="toast-actions">
        <button class="btn btn-dismiss" data-action="dismiss">Dismiss</button>
        <button class="btn btn-save" data-action="save">Save to vault</button>
      </div>
    `;

    // If favicon image fails to load, fall back to the shield SVG
    if (account.icon) {
      const img = toast.querySelector<HTMLImageElement>('.toast-icon img');
      if (img) {
        img.onerror = () => {
          const iconDiv = toast.querySelector('.toast-icon');
          if (iconDiv) {
            iconDiv.innerHTML = shieldSvg;
          }
        };
      }
    }

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
  const wrapper = ensureWrapper();;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-icon" style="background: #333d4d;">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#eaeef5"/></svg>
      </div>
      <div>
        <div class="toast-title">No QR codes found</div>
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
