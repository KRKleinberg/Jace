import { Player } from "discord-player";
import { Client, Collection } from "discord.js";
import HttpsProxyAgent from "https-proxy-agent";
import handler from "./handler";

const client = new Client({
	intents: 32767,
});

const proxy = "http://user:pass@111.111.111.111:8080";
const agent = HttpsProxyAgent(proxy);

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
	leaveOnStop: false,
	leaveOnEmpty: false,
	leaveOnEmptyCooldown: 1000,
	autoSelfDeaf: true,
};

console.log(client.playerOptions);

client.player = new Player(client, {
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
	leaveOnStop: false,
	leaveOnEmpty: false,
	leaveOnEmptyCooldown: 1000,
	autoSelfDeaf: true,
});

export default client;

client.prefixCommands = new Collection();
client.slashCommands = new Collection();

handler(client);

client.login(process.env.DJS_TOKEN);
