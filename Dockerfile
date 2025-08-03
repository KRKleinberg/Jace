FROM node:lts-slim

WORKDIR /jace

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY . .

# Start the app.
CMD ["npm", "start"]
