FROM node:12-alpine

WORKDIR /app
COPY . .

RUN npm ci

CMD npm run start