import { App } from '#utils/app';
import { Player } from '#utils/player';

await Player.registerExtractors();

await App.initializeCommands();
await App.initializeEvents();

await App.login(process.env.DISCORD_BOT_TOKEN);
