/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone', // Use standalone output for better deployment compatibility
  experimental: {
    esmExternals: "loose",
  },
  compiler: {
    styledJsx: false, // Disable styled-jsx completely
  },
  webpack: (config, { isServer }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Handle missing React Native dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    
    // Completely externalize styled-jsx to prevent context issues
    if (isServer) {
      config.externals.push("styled-jsx", "styled-jsx/style");
    }
    
    return config;
  },
  // Disable error page static generation
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
