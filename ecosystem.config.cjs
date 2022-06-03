module.exports = {
	apps: [
		{
			name: "jace-bot",
			script: "./index.js",
			instances: "max",
			exec_mode: "cluster",
			stop_exit_codes: [0],
			exp_backoff_restart_delay: 100,
			env_production: {
				NODE_ENV: "production",
			},
			env_development: {
				NODE_ENV: "development",
			},
			wait_ready: true,
		},
	],
};
