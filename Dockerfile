FROM node:latest



# Create the bot's directory

RUN mkdir -p /usr/src/JaceBot

WORKDIR /usr/src/JaceBot



COPY package.json /usr/src/JaceBot

RUN npm install



COPY . /usr/src/JaceBot



# Start the bot.

CMD ["node", "index.js"]