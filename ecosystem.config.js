module.exports = {
  apps: [{
    name: 'solflo',
    script: '.next/standalone/server.js',
    instances: 4,
    exec_mode: 'cluster',
    max_memory_restart: '1800M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    out_file: '/var/log/pm2/solflo-out.log',
    error_file: '/var/log/pm2/solflo-err.log',
    merge_logs: true,
    time: true,
    wait_ready: true,
    listen_timeout: 15000,
    kill_timeout: 10000,
    restart_delay: 5000,
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: 10000
  }]
};