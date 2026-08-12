FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
# npm ci respects the lockfile
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static     ./.next/static
COPY --from=build /app/public           ./public

USER node

EXPOSE 3000
CMD ["node", "server.js"]
