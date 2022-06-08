export default {
	name: "shuffle",
	aliases: ["sh"],
	description: "Shuffles the queue",
	options: [],
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				const success = queue.shuffle();

				interaction.deferReply({
					content: success ? "🔀 | Queue has been shuffled!" : "❌ | Something went wrong!",
				});
			} else interaction.deferReply({ content: "❌ | No music is playing!" });
		} else interaction.deferReply({ content: "❌ | You're not in a voice channel!" });
	},
};
