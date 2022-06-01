this.name = "ping";
this.description = "Returns websocket ping";
//export const name = "ping";
//export const aliases = [];
//export const description = "Returns websocket ping";
//export const options = [];
export async function run(client, message) {
	message.channel.send({ content: `📶 | \`${client.ws.ping}ms\`` });
}
