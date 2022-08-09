module.exports = {
	apps: [
		{
			name: "jace-bot",
			script: "node build/index.js",
			exp_backoff_restart_delay: 100,
		},
	],
};
