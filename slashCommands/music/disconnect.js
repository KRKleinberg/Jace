export default {
	name: "disconnect",
	description: "Disconnects from voice channel",
	run: async (client, interaction) => {
		let queue = client.player.getQueue(interaction.guildId);

		if (!queue || !queue.playing) queue = await client.player.createQueue(interaction.guild);

		queue.destroy();

		interaction.reply({ content: "🔌 | Disconnected!" });
	},
};
