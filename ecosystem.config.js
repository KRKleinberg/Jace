module.exports = {
	apps: [
		{
			name: "jace-bot",
			script: "./index.js",
			instances: "max",
			exec_mode: "cluster",
			stop_exit_codes: [0],
			exp_backoff_restart_delay: 100,
		},
	],
};
