export default {
	name: "skip",
	aliases: ["fs"],
	description: "Skips the current song",
	options: [],
	run: async (client, message) => {
        const queue = client.player.getQueue(message.guildId);
        
		if (!queue || !queue.playing)
            return message.channel.send({ content: "❌ | No music is being played!" });
        
		const currentTrack = queue.current;
        const success = queue.skip();
        
		return message.channel.send({
			content: success ? `⏭️ | Skipped **${currentTrack}**!` : "❌ | Something went wrong!",
		});
	},
};
