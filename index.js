import { Player } from "discord-player";
import { Client, Collection } from "discord.js";
import handler from "./handler.js";

const client = new Client({
	intents: 32767,
});

client.player = new Player(client);

client.prefixCommands = new Collection();
client.slashCommands = new Collection();

export default client;

handler(client);

client.login(process.env.DJS_TOKEN);
