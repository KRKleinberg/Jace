FROM node:lts-bookworm-slim

COPY package.json /app/

WORKDIR /app/

RUN apt-get update && apt-get install -y ffmpeg && apt-get install -y python2

RUN npm cache clean -f

RUN npm install

COPY . .

RUN npm run build

# Start the bot.
CMD ["npm", "start"]
