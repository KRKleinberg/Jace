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

				interaction.reply({
					content: success ? "🔀 | Queue has been shuffled!" : "❌ | Something went wrong!",
				});
			} else interaction.reply({ content: "❌ | No music is playing!" });
		} else interaction.reply({ content: "❌ | You're not in a voice channel!" });
	},
};
