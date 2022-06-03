export default {
	name: "clear",
	description: "Clears the queue",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				queue.clear();

				interaction.deferReply({ content: "🧼 | Queue cleared." });
			} else interaction.deferReply({ content: "❌ | No music is being played!" });
		} else interaction.deferReply({ content: "❌ | You're not in a voice channel!" });
	},
};
