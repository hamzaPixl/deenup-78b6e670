/** @type {import('next').NextConfig} */
const nextConfig = {
  // serverActions are enabled by default in Next.js 14 — no experimental flag needed
  transpilePackages: ['@deenup/shared'],
};

module.exports = nextConfig;
