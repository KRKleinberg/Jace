import { Player } from "discord-player";
import { Client, Collection } from "discord.js";
import HttpsProxyAgentPKG from "https-proxy-agent";
import MongoosePKG from "mongoose";
const { HttpsProxyAgent } = HttpsProxyAgentPKG;
const { connect } = MongoosePKG;

const client = new Client({
	intents: 32767,
});

const proxy = "http://user:pass@111.111.111.111:8080";
const agent = HttpsProxyAgent(proxy);

client.player = new Player(client, {
	ytdlOptions: {
		requestOptions: {
			agent,
			headers: {
				cookie: process.env.COOKIE,
			},
		},
	},
});

export default client;

connect(process.env.MONGOOSE).then(() => console.log("Connected to MongoDB"));

client.prefixCommands = new Collection();
client.slashCommands = new Collection();

import "./handler/index.js";

client.login(process.env.DJS_TOKEN);
