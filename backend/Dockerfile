FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
