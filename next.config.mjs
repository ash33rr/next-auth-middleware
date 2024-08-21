/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  images: {
    domains: ['i.ytimg.com', 'localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*', 
        destination: 'http://localhost:5000/backend-api/:path*',
      },
    ];
  },
};

export default nextConfig;
