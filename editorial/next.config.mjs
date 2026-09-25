const config = {
  output: 'export', basePath: '/varathans25', trailingSlash: true,
  poweredByHeader: false, productionBrowserSourceMaps: false,
  images: { unoptimized: true },
  experimental: { cpus: 2 },
  generateBuildId: async () => 'packaging-editorial-v1',
};
export default config;
