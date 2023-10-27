FROM node:lts-bookworm-slim

COPY package.json /app/

WORKDIR /app/

RUN npm cache clean –f

RUN npm install

COPY . .

RUN npm run build

RUN apt-get update && apt-get install -y ffmpeg


# Start the bot.

CMD ["npm", "start"]
