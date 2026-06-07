/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["laluz.vn", "lh3.googleusercontent.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "laluz.vn",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
