const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude wallet-kit from server-side bundling to avoid "self is not defined"
      if (!config.externals) {
        config.externals = [];
      }
      if (Array.isArray(config.externals)) {
        config.externals.push("@suiet/wallet-kit");
      } else {
        config.externals = [config.externals, "@suiet/wallet-kit"];
      }
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        port: "",
        pathname: "/ipfs/**",
      },
    ],
  },
};

export default nextConfig;
