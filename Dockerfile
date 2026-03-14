FROM node:lts-slim AS build
WORKDIR /jace
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY . .

FROM cgr.dev/chainguard/node:latest
WORKDIR /jace
COPY --from=build /jace .
CMD ["node_modules/.bin/tsx", "src/index.ts"]