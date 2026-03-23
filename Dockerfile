FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx tailwindcss -i ./public/css/input.css -o ./public/css/output.css --minify

RUN npm prune --production

EXPOSE 80

CMD ["node", "app.js"]
