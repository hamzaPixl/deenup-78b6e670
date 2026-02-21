/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  transpilePackages: ['@deenup/shared'],
};

module.exports = nextConfig;
