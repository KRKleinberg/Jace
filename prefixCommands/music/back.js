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
					const success = queue.back();

					message.channel.send({
						content: success ? "⏮️ | Playing the previous track!" : "❌ | Something went wrong!",
					});
				} else message.channel.send({ content: "❌ | There are no previous tracks!" });
			} else message.channel.send({ content: "❌ | No music is playing!" });
		} else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
