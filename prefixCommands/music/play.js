import { QueryType } from "discord-player";

export default {
	name: "play",
	aliases: ["p"],
	description: "Plays a song",
	options: ["\u0060song\u0060"],
	run: async (client, message, args) => {
		const query = args.join(" ");
		const searchResult = await client.player
			.search(query, {
				requestedBy: message.author,
				searchEngine: QueryType.AUTO,
			})
			.catch(() => {});
		if (!searchResult || !searchResult.tracks.length)
			return message.channel.send({ content: `No results were found!` });

		const { playerOptions } = client;
		playerOptions.metadata = message.channel;

		const queue = await client.player.createQueue(message.guild, playerOptions);

		try {
			if (!queue.connection) await queue.connect(message.member.voice.channel);
		} catch {
			client.player.deleteQueue(message.guildId);
			return message.channel.send({ content: "Could not join your voice channel!" });
		}

		await message.channel.send({
			content: `⏱ | Loading your ${searchResult.playlist ? "playlist" : "track"}...`,
		});

		if (searchResult.playlist) queue.addTracks(searchResult.tracks);
		else queue.addTrack(searchResult.tracks[0]);

        if (!queue.playing) await queue.play();
        
        return null;
	},
};
