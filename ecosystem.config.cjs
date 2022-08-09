module.exports = {
	apps: [
		{
			name: "jace-bot",
			script: "./dist/index.js",
			exp_backoff_restart_delay: 100,
		},
	],
};
