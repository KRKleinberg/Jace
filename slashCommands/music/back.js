export default {
	name: "back",
	aliases: [],
	description: "Plays the previous track",
	options: [],
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
            const queue = client.player.getQueue(interaction.guildId);
            
			if (queue && queue.playing) {
				if (queue.previousTracks.length > 1) {
					queue.back();

					interaction.deferReply({ content: "⏮️ | Playing the previous track!" });
				} else interaction.deferReply({ content: "❌ | There are no previous tracks!" });
			} else interaction.deferReply({ content: "❌ | No music is being played!" });
		} else interaction.deferReply({ content: "❌ | You're not in a voice channel!" });
	},
};
