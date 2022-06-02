import { Player } from "discord-player";
import { Client, Collection } from "discord.js";
import HttpsProxyAgent from "https-proxy-agent";
import handler from "./handler.js";

const client = new Client({
	intents: 32767,
});

export const agent = HttpsProxyAgent("http://50.218.57.66:80");

client.playerOptions = {
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
};

client.player = new Player(client, client.playerOptions);

export default client;

client.prefixCommands = new Collection();
client.slashCommands = new Collection();

handler(client);

client.login(process.env.DJS_TOKEN);
