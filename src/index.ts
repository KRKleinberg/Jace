import { App } from '#utils/app';
import { Player } from '#utils/player';

await Player.initializePlayer();
await App.initializeCommands();
await App.initializeEvents();

await App.client.login(process.env.DISCORD_BOT_TOKEN);
