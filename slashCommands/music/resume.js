export default {
	name: "resume",
	description: "Resumes the current song",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				const resumed = queue.setPaused(false);

				interaction.reply({ content: resumed ? "▶ | Resumed!" : "❌ | Something went wrong!" });
			} else interaction.reply({ content: "❌ | No music is playing!" });
		} else interaction.reply({ content: "❌ | You're not in a voice channel!" });
	},
};
