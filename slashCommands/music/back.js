export default {
	name: "back",
	description: "Plays the previous track",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				if (queue.previousTracks.length > 1) {
					queue.back();

					interaction.reply({ content: "⏮️ | Playing the previous track!" });
				} else interaction.reply({ content: "❌ | There are no previous tracks!" });
			} else interaction.reply({ content: "❌ | No music is playing!" });
		} else interaction.reply({ content: "❌ | You're not in a voice channel!" });
	},
};
