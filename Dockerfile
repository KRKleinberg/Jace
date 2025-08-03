FROM node:lts-slim

WORKDIR /jace

RUN apt-get update && apt-get install -y \
  build-essential \
  ca-certificates \
  ffmpeg

COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY . .

# Start the app.
CMD ["npm", "start"]
