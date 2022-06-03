export default {
	name: "skip",
	description: "Skips the current song",
	run: async (client, interaction) => {
		const queue = client.player.getQueue(interaction.guildId);
		if (queue || queue.playing) {
			
			const currentTrack = queue.current;
			const success = queue.skip();
			interaction.followUp({
				content: success ? `⏭️ | Skipped **${currentTrack}**!` : "❌ | Something went wrong!",
			});
		} else interaction.followUp({ content: "❌ | No music is being played!" });
	},
};
