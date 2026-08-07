/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Without this, the client Router Cache can reuse a recently-visited
    // route's rendered output on top of stale useState initializers (e.g.
    // admin/items/[id]/ItemForm), showing the previous item's data for a
    // moment (or longer) after navigating to a different item.
    staleTimes: { dynamic: 0 },
  },
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
