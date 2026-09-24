export function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7V11H8.2v3h2.5v7h2.8z" />
    </svg>
  );
}

export function TiktokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.8a4.8 4.8 0 0 1-1.2-3.1V2.3h-3v12.9a2.4 2.4 0 1 1-1.7-2.3V9.8a5.5 5.5 0 1 0 4.7 5.5V9.2a7.9 7.9 0 0 0 4.3 1.3V7.4a4.8 4.8 0 0 1-3.1-1.6z" />
    </svg>
  );
}

export const SOCIAL_ICONS: Record<string, () => React.ReactElement> = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  TikTok: TiktokIcon,
};
