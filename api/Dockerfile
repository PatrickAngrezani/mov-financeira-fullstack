FROM node:24-bookworm-slim AS base
WORKDIR /app

# ---------- dependences ----------
FROM base AS deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./

# --ignore-scripts
RUN npm ci 

# ---------- build ----------
FROM deps AS build
COPY . .

RUN npx prisma generate && npm run build
# remove devDependences after compile
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules      ./node_modules
COPY --from=build /app/dist              ./dist
COPY --from=build /app/prisma            ./prisma
COPY --from=build /app/prisma.config.ts  ./prisma.config.ts
COPY --from=build /app/package.json      ./package.json

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER node

EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
