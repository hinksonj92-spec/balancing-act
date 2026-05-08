/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA headers for installability
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
