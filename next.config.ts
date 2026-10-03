import type { NextConfig } from 'next';

const isPagesBuild = process.env.GITHUB_PAGES_BUILD === 'true';
const nextConfig: NextConfig = isPagesBuild
  ? {
      output: 'export',
      // Keep route matching at / during prerendering. Native links use sitePath;
      // assetPrefix places scripts/styles below the Pages repository URL.
      assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
