FROM ubuntu:latest

WORKDIR /jace

RUN apt-get update && apt-get install -y \
  nodejs \
  npm \
  build-essential \
  ffmpeg

COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY . .

# Start the app.
CMD ["npm", "start"]
