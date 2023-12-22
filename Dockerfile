FROM node:lts-bookworm-slim

RUN \
  apt-get update && \
  apt-get install -y ffmpeg && \
  apt-get install -y python3

COPY package.json /app/

WORKDIR /app/

RUN npm cache clean -f

RUN npm ci

COPY . .

RUN npm run build

# Start the bot.
CMD ["npm", "start"]
