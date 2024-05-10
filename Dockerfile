FROM node:lts-bookworm-slim

WORKDIR /app/

RUN \
  apt-get update && \
  apt-get install -y build-essential && \
  apt-get install -y ffmpeg

COPY package.json /app/

RUN npm install

COPY . .

RUN npm run build

# Start the bot.
CMD ["npm", "start"]
