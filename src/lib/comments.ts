// Pure client-side comment logic. Shared by Comments.astro and unit-tested here.
// The PHP endpoint re-validates everything server-side; never trust the client.

export const LIMITS = { name: 80, email: 190, body: 5000 } as const;

const PAGE_KEY_RE = /^(blog|podcast)\/[A-Za-z0-9._/-]{1,180}$/;
export function isValidPageKey(key: string): boolean {
  return PAGE_KEY_RE.test(key);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return email.length <= LIMITS.email && EMAIL_RE.test(email);
}

export interface CommentInput {
  name: string;
  email: string;
  body: string;
}

export function validateComment(input: CommentInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim();
  const body = (input.body ?? '').trim();
  if (name.length < 1 || name.length > LIMITS.name) errors.push('name');
  if (!isValidEmail(email)) errors.push('email');
  if (body.length < 1 || body.length > LIMITS.body) errors.push('body');
  return { ok: errors.length === 0, errors };
}

// Same-origin in prod; PUBLIC_COMMENTS_API lets local dev point at a php -S server.
export function commentsApiUrl(
  env: { PUBLIC_COMMENTS_API?: string } = import.meta.env,
): string {
  return env.PUBLIC_COMMENTS_API || '/api/comments.php';
}

export function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
