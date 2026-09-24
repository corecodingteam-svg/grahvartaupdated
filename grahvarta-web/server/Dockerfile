# Build context is ./grahvarta-web (needs package.json and src/data alongside server/)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src/data ./src/data
COPY server ./server
EXPOSE 8787
CMD ["node", "server/index.js"]
