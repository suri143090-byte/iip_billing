# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
RUN npm install ajv --legacy-peer-deps

# Copy rest of application
COPY . .

# Set env for build
ENV REACT_APP_BACKEND_URL=""

# Build the app
RUN npm run build

# Stage 2: Serve application with Nginx
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
