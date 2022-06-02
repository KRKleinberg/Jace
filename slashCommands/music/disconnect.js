export default {
	name: "disconnect",
	description: "Disconnects from voice channel",
	/**
	 *
	 * @param {Client} client
	 * @param {CommandInteraction} interaction
	 * @param {String[]} args
	 */
	run: async (client, interaction) => {
		let queue = client.player.getQueue(interaction.guildId);

		if (!queue || !queue.playing) queue = await client.player.createQueue(interaction.guild);

		queue.destroy();

		return interaction.followUp({ content: "🔌 | Disconnected!" });
	},
};
