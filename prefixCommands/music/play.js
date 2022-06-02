import { QueryType } from "discord-player";
import { agent } from "../../index.js";

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

		const queue = await client.player.createQueue(message.guild, {
			ytdlOptions: {
				requestOptions: {
					agent,
					headers: {
						cookie: process.env.COOKIE,
					},
				},
				quality: "highest",
				filter: "audioonly",
				// eslint-disable-next-line no-bitwise
				highWaterMark: 1 << 25,
				dlChunkSize: 0,
			},
			leaveOnEnd: false,
			leaveOnStop: true,
			leaveOnEmpty: false,
			leaveOnEmptyCooldown: 5000,
			autoSelfDeaf: true,
			metadata: message.channel,
		});

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
	},
};
