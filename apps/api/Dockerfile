FROM node:18-alpine

WORKDIR /app

# Copy root package.json and lockfile
COPY package.json ./

# Copy packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies (from root to link workspaces)
RUN npm install

# Build shared
WORKDIR /app/packages/shared
RUN npm run build

# Build API
WORKDIR /app/apps/api
RUN npm run build
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start"]
