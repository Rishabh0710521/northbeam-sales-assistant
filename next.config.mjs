const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["imapflow", "mailparser", "nodemailer", "pg"]
  }
};

export default nextConfig;
