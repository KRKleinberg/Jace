module.exports = {
	name: "seek",
	aliases: [],
	description: "Seeks to given time",
	options: ["\u0060time\u0060"],
    run: async (client, message, args) => {
        if (message.member.voice.channel) {
            const queue = client.player.getQueue(message.guildId);

            if (queue && queue.playing) {
                const time = args[0] * 1000;
                const success = queue.seek(time);

                message.channel.send({
                    content: success ? `⏩ | Seeked to ${time / 1000} seconds` : "❌ | Something went wrong!",
                });
            } else message.channel.send({ content: "❌ | No music is playing!" });
        } else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
