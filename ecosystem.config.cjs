module.exports = {
	apps: [
		{
			name: "jace-bot",
			script: "./index.js",
			stop_exit_codes: [0],
			exp_backoff_restart_delay: 100,
		},
	],
};
