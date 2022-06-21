import { Player } from "discord-player";
import { Client, Collection } from "discord.js";
import pm2 from "pm2";
import handler from "./handler.js";

const client = new Client({
	intents: 32767,
});

client.player = new Player(client);
client.prefixCommands = new Collection();
client.slashCommands = new Collection();

export default client;

handler(client);

if (process.env.HEROKU_BRANCH === "dev") {
	setTimeout(() => {
		pm2.stop("jace-bot");
	}, 300000);
}

client.login(1).catch(err => {
	console.log(err);
	process.exit(4);
}) 

