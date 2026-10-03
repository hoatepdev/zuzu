# Build from repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @zuzu/api --ignore-scripts
COPY apps/api apps/api
RUN cd apps/api && npx prisma generate && npm run build \
 && npx tsc prisma/bootstrap.ts prisma/seed.ts --outDir dist-scripts --module commonjs --target es2022 --esModuleInterop --skipLibCheck --moduleResolution node

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app/apps/api
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/dist-scripts ./dist-scripts
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 3100
CMD ["sh", "-c", "npm run db:migrate:deploy && npm run start:prod"]
