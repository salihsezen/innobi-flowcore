FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm install

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/apps/web
# Next.js build
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
