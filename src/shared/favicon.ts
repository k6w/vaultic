// Map common service names to their domains
const ISSUER_DOMAIN_MAP: Record<string, string> = {
  'github': 'github.com',
  'google': 'google.com',
  'discord': 'discord.com',
  'twitter': 'twitter.com',
  'x': 'x.com',
  'facebook': 'facebook.com',
  'meta': 'meta.com',
  'amazon': 'amazon.com',
  'aws': 'aws.amazon.com',
  'microsoft': 'microsoft.com',
  'apple': 'apple.com',
  'dropbox': 'dropbox.com',
  'slack': 'slack.com',
  'reddit': 'reddit.com',
  'twitch': 'twitch.tv',
  'steam': 'steampowered.com',
  'epic games': 'epicgames.com',
  'binance': 'binance.com',
  'coinbase': 'coinbase.com',
  'kraken': 'kraken.com',
  'cloudflare': 'cloudflare.com',
  'digitalocean': 'digitalocean.com',
  'gitlab': 'gitlab.com',
  'bitbucket': 'bitbucket.org',
  'npm': 'npmjs.com',
  'pypi': 'pypi.org',
  'docker': 'docker.com',
  'heroku': 'heroku.com',
  'vercel': 'vercel.com',
  'netlify': 'netlify.com',
  'stripe': 'stripe.com',
  'paypal': 'paypal.com',
  'linkedin': 'linkedin.com',
  'instagram': 'instagram.com',
  'snapchat': 'snapchat.com',
  'tiktok': 'tiktok.com',
  'youtube': 'youtube.com',
  'spotify': 'spotify.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'zoom': 'zoom.us',
  'proton': 'proton.me',
  'protonmail': 'proton.me',
  'bitwarden': 'bitwarden.com',
  '1password': '1password.com',
  'lastpass': 'lastpass.com',
  'namecheap': 'namecheap.com',
  'godaddy': 'godaddy.com',
  'ovh': 'ovh.com',
  'hetzner': 'hetzner.com',
  'vultr': 'vultr.com',
  'linode': 'linode.com',
};

/**
 * Get a favicon URL for a given issuer name.
 * Uses the account's stored icon URL if available,
 * otherwise resolves via Google's favicon service.
 */
export function getFaviconUrl(issuer: string, storedIcon?: string): string | null {
  // If we have a stored icon URL from QR detection, use it
  if (storedIcon) return storedIcon;

  if (!issuer) return null;

  // Check if issuer looks like a domain already (contains a dot)
  if (issuer.includes('.')) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(issuer)}&sz=64`;
  }

  // Try to map the issuer name to a domain
  const normalized = issuer.toLowerCase().trim();
  const domain = ISSUER_DOMAIN_MAP[normalized];
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  }

  // Try the issuer name as a .com domain as last resort
  const guess = normalized.replace(/\s+/g, '') + '.com';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(guess)}&sz=64`;
}
