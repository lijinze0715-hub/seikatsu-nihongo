/** Prefix native anchor links when the site is hosted below a repository path. */
export function sitePath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${basePath}${path.endsWith('/') ? path : `${path}/`}`;
}
