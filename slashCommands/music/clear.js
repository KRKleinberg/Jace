export default {
	name: "clear",
	description: "Clears the queue",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				queue.clear();

				interaction.reply({ content: "🧼 | Queue cleared." });
			} else interaction.reply({ content: "❌ | No music is playing!" });
		} else interaction.reply({ content: "❌ | You're not in a voice channel!" });
	},
};
