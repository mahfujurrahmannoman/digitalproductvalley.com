FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx tailwindcss -i ./public/css/input.css -o ./public/css/output.css --minify

EXPOSE 3000

CMD ["node", "app.js"]
