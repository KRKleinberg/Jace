export default {
	name: "resume",
	description: "Resumes the current song",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				const resumed = queue.setPaused(false);

				interaction.deferReply({ content: resumed ? "▶ | Resumed!" : "❌ | Something went wrong!" });
			} else interaction.deferReply({ content: "❌ | No music is playing!" });
		} else interaction.deferReply({ content: "❌ | You're not in a voice channel!" });
	},
};
