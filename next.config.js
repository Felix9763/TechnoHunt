const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      '/*': ['./config/**/*', './public/**/*'],
    },
  },
  async rewrites() {
    return [
      {
        source: '/round1/:path*',
        destination: '/assets/round1/:path*',
      },
      {
        source: '/round2/:path*',
        destination: '/assets/round2/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
