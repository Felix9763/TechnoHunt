/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      '/*': ['./config/**/*'],
    },
  },
};

module.exports = nextConfig;
