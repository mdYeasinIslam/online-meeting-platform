import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output:'standalone',
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname:'localhost'
      }
      , {
        protocol:'https',
        hostname:"**"
      }
    ]
  }
};

export default nextConfig;
