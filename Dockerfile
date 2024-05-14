FROM node:lts-bookworm-slim

WORKDIR /jace

RUN apt-get update && apt-get install -y \
  build-essential \
  ffmpeg

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

# Start the bot.
CMD ["npm", "start"]
