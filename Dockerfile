# Dockerisation du front Angular pour le déploiement (SCRUM-18).
# Structure calquée sur le Dockerfile du back pour rester cohérent entre dépôts.

# --- Build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Prod : nginx ne sert que les fichiers statiques compilés ---
# Pas de Node dans l'image finale : rien d'exécutable côté serveur, donc
# une surface d'attaque très réduite.
FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/brume-front/browser /usr/share/nginx/html
EXPOSE 80
