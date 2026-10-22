/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.SKILLBERY_E2E === '1' ? '.next-e2e' : '.next',
  /* config options here */
  allowedDevOrigins: ['172.20.10.2', '172.20.10.3'],
};

export default nextConfig;
