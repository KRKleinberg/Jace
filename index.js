import { Player } from "discord-player";
import { Client, Collection } from "discord.js";
import handler from "./handler.js";

const client = new Client({
	intents: 32767,
	playerOptions: {
		ytdlOptions: {
			requestOptions: {
				headers: {
					cookie: process.env.COOKIE,
					"x-youtube-identity-token": process.env.ID_TOKEN,
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
	},
	prefixCommands: new Collection(),
	slashCommands: new Collection(),
});

client.defaultActivity = client.user.setActivity({
	name: `Frogger | ${process.env.PREFIX}help`,
	type: "PLAYING",
});

client.player = new Player(client, client.playerOptions);

export default client;

handler(client);

client.login(process.env.DJS_TOKEN);
