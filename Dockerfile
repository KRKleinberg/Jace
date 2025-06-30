FROM ubuntu:latest

WORKDIR /jace

RUN apt-get update && apt-get install -y \
  curl \
  build-essential \
  ffmpeg

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -

RUN apt-get install -y \
  nodejs \
  npm

COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY . .

# Start the app.
CMD ["npm", "start"]
