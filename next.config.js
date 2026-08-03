/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    return [
      {
        source: "/portfolio",
        destination: "https://deepanshu-one.vercel.app/",
        permanent: true,
      },
      {
        source: "/portfolio/:path*",
        destination: "https://deepanshu-one.vercel.app/",
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
