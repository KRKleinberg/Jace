export default {
	name: "seek",
	description: "Seeks to given time",
	options: [
		{
			name: "time",
			description: "The time to seek to (in seconds)",
			type: "NUMBER",
			required: true,
		},
	],
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				const time = interaction.options.time * 1000;
				const success = queue.seek(time);

				interaction.followUp({
					content: success ? `⏩ | Seeked to ${time / 1000} seconds` : "❌ | Something went wrong!",
				});
			} else interaction.followUp({ content: "❌ | No music is playing!" });
		} else interaction.followUp({ content: "❌ | You're not in a voice channel!" });
	},
};
