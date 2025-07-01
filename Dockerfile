FROM ubuntu:latest

WORKDIR /jace

RUN apt-get update && apt-get install -y \
  curl \
  build-essential \
  ffmpeg

RUN curl -fsSL https://deb.nodesource.com/setup_23.x -o nodesource_setup.sh && \
  bash nodesource_setup.sh && \
	apt-get install -y nodejs

COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY . .

# Start the app.
CMD ["npm", "start"]
