export default {
	name: "restart",
	description: "Restarts the bot",
	run: async (client, interaction) => {
		interaction.followUp({ content: `🔄️ | <@${client.user.id}> is restarting` });
		client.user.setStatus("idle");
		client.user.setActivity({
			name: "Restarting...",
			type: "PLAYING",
		});

		console.log("Bot is restarting...");

		process.exit(1);
	},
};
