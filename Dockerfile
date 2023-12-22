FROM node:lts-bookworm-slim

COPY package.json /app/

WORKDIR /app/

RUN apt-get update

RUN apt-get install -y ffmpeg

RUN npm cache clean -f

RUN npm ci

COPY . .

RUN npm run build

# Start the bot.
CMD ["npm", "start"]
