export default {
	name: "pause",
	description: "Pauses the current song",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				const paused = queue.setPaused(true);

				interaction.reply({ content: paused ? "⏸ | Paused!" : "❌ | Something went wrong!" });
			} else interaction.reply({ content: "❌ | No music is playing!" });
		} else interaction.reply({ content: "❌ | You're not in a voice channel!" });
	},
};
