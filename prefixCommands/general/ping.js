export default {
	name: "ping",
	description: "Returns websocket ping",
};
export async function run(client, message) {
	message.channel.send({ content: `📶 | \`${client.ws.ping}ms\`` });
}
