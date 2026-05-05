module.exports = {
  apps: [
    {
      name: "bps-command",
      script: "npx",
      args: "serve dist -p 4001 -s",
      cwd: "/root/apps/BPScommand_dev",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
    },
  ],
};
