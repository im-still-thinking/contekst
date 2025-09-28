import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Handle missing React Native deps
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };

    // ✅ Force a single React/React-DOM instance
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react$': path.resolve(process.cwd(), '../../node_modules/react'),
      'react-dom$': path.resolve(process.cwd(), '../../node_modules/react-dom'),
    };

    return config;
  },
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
