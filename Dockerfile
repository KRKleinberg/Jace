FROM node:lts-bookworm-slim

COPY package.json /app/

WORKDIR /app/

RUN npm cache clean -f

RUN npm install

COPY . .

RUN npm run build

RUN \
  yum update && \
  yum install -y ffmpeg


# Start the bot.

CMD ["npm", "start"]
