FROM node:latest

COPY package.json /app/

WORKDIR /app/

RUN npm install

COPY . .

RUN npm run build

RUN apt-get update && apt-get install -y ffmpeg


# Start the bot.

CMD ["npm", "start"]