const nextConfig = {
  transpilePackages: ['@mediapipe/tasks-vision'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
