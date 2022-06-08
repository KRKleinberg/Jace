export default {
	name: "pause",
	description: "Pauses the current song",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				const paused = queue.setPaused(true);

				interaction.followUp({ content: paused ? "⏸ | Paused!" : "❌ | Something went wrong!" });
			} else interaction.followUp({ content: "❌ | No music is playing!" });
		} else interaction.followUp({ content: "❌ | You're not in a voice channel!" });
	},
};
