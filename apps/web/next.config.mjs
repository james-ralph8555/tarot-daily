/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@node-rs/argon2": "commonjs @node-rs/argon2",
        "@node-rs/argon2-linux-x64-gnu": "commonjs @node-rs/argon2-linux-x64-gnu",
        "@node-rs/argon2-linux-x64-musl": "commonjs @node-rs/argon2-linux-x64-musl",
        "@node-rs/bcrypt": "commonjs @node-rs/bcrypt",
        "@node-rs/bcrypt-linux-x64-gnu": "commonjs @node-rs/bcrypt-linux-x64-gnu",
        "@node-rs/bcrypt-linux-x64-musl": "commonjs @node-rs/bcrypt-linux-x64-musl"
      });
    }

    config.module.rules.push({
      test: /\.html$/,
      type: "asset/source"
    });

    // Ignore .node files in webpack bundling
    config.resolve.extensions.push('.node');
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  }
};

export default nextConfig;
