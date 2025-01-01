FROM node:lts-bookworm-slim

WORKDIR /jace

RUN apt-get update && apt-get install -y \
  build-essential \
  ffmpeg

RUN npm install -g typescript

COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY . .

RUN npm run build

# Start the app.
CMD ["npm", "start"]
