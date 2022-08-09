import { Player } from "discord-player";
import { Client, Collection } from "discord.js";
import pm2 from "pm2";
import handler from "./handler.js";

export const client = new Client({
	intents: [
		"Guilds",
		"GuildMembers",
		"GuildBans",
		"GuildIntegrations",
		"GuildWebhooks",
		"GuildInvites",
		"GuildVoiceStates",
		"GuildPresences",
		"GuildMessages",
		"GuildMessageReactions",
		"GuildMessageTyping",
		"DirectMessages",
		"DirectMessageReactions",
		"DirectMessageTyping",
	],
});
export const player: Player = new Player(client);

export const prefixCommands: Collection<string, any> = new Collection();
export const slashCommands: Collection<string, any> = new Collection();

handler();

if (process.env.HEROKU_BRANCH === "dev") {
	setTimeout(() => {
		pm2.stop("jace-bot", (err) => {
			if (err) throw err;
		});
	}, 300000);
}

client.login(process.env.DJS_TOKEN);
