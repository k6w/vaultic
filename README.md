# Vaultic

A browser extension that combines a TOTP two-factor authentication manager with disposable temporary email, all secured behind an encrypted vault.

Built for Chrome and Firefox.

## Features

### Authenticator
- Generate TOTP 2FA codes with real-time countdown
- Auto-detect QR codes on web pages (scans on page load + MutationObserver for dynamic content)
- Right-click any image to scan it as a QR code
- Manual entry — paste a secret key like `I65VU7K5ZQL7WB4E` or a full `otpauth://` URI
- Service favicons resolved automatically via issuer name
- Click-to-copy codes from popup or side panel
- Import/export as JSON or `otpauth://` URIs (Google Authenticator compatible)

### Temporary Email
- Create disposable email addresses via [mail.tm](https://mail.tm)
- Inbox with auto-refresh (30s polling)
- Full message viewer with HTML rendering (sandboxed iframe)
- Attachment support
- Account credentials stored in vault and included in exports

### Security
- AES-256-GCM encryption with PBKDF2 key derivation (600,000 iterations, SHA-256)
- Master password required to unlock
- Auto-lock after configurable idle timeout
- Brute-force protection with exponential cooldown
- All vault operations run through the background service worker
- Content script UI isolated via closed Shadow DOM

## Architecture

```
src/
  background/     # Service worker: vault ops, message routing, mail SSE, alarms
  content/        # Content script: QR scanning (jsQR), shadow DOM toast
  popup/          # React popup (400x550): quick TOTP access, search, copy
  sidepanel/      # React side panel: full manager (authenticator, mail, import/export, settings)
  shared/         # Shared modules: crypto, TOTP, mail API client, types, favicon resolver
  hooks/          # React hooks: useVault, useTotp, useCountdown, useMail
  manifest/       # chrome.json (MV3 + sidePanel) and firefox.json (MV3 + sidebar_action)
```

Four separate Vite builds (popup, sidepanel, background, content) orchestrated by `scripts/build.ts`. Background and content scripts use IIFE format for MV3 compatibility.

## Tech Stack

- **UI**: React 18, TypeScript, Tailwind CSS v4
- **Build**: Vite 7, multi-config with `tsx` orchestrator
- **Crypto**: Web Crypto API (`crypto.subtle`) — AES-256-GCM + PBKDF2
- **TOTP**: `otpauth` library
- **QR**: `jsQR` library
- **Cross-browser**: `webextension-polyfill`
- **Mail**: mail.tm REST API + Mercure SSE (via fetch + ReadableStream)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & Build

```bash
npm install

# Chrome (default)
npm run build

# Firefox
npm run build:firefox
```

### Load in Browser

**Chrome:**
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/manifest.json`

## CI/CD

GitHub Actions workflow builds both Chrome and Firefox on every push. When a version tag is pushed, it creates a GitHub Release with both zips:

```bash
git tag v1.0.0
git push origin main --tags
```

Release artifacts:
- `vaultic-chrome.zip` — Chrome/Chromium-based browsers
- `vaultic-firefox.zip` — Firefox

## License

ISC
