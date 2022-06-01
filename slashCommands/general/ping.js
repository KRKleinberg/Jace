export const name = "ping";
export const description = "Returns websocket ping";
export const type = "CHAT_INPUT";
export async function run(client, interaction) {
	interaction.followUp({ content: `📶 | \`${client.ws.ping}ms\`` });
}
