export default {
	name: "back",
	aliases: [],
	description: "Plays the previous track",
	options: [],
	run: async (client, message) => {
		if (message.member.voice.channel) {
            const queue = client.player.getQueue(message.guildId);
            
			if (queue && queue.playing) {
				if (queue.previousTracks.length > 1) {
					queue.back();

					message.channel.send({ content: "⏮️ | Playing the previous track!" });
				} else message.channel.send({ content: "❌ | There are no previous tracks!" });
            } else message.channel.send({ content: "❌ | No music is being played!" });
		} else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
