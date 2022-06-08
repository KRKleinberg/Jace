export default {
	name: "skip",
	description: "Skips the current song",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				const currentTrack = queue.current;
				const success = queue.skip();
				interaction.reply({
					content: success ? `⏭️ | Skipped **${currentTrack}**!` : "❌ | Something went wrong!",
				});
			} else interaction.reply({ content: "❌ | No music is playing!" });
		} else interaction.reply({ content: "❌ | You're not in a voice channel!" });
	},
};
