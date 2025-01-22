# 1) Build stage
FROM node:18-alpine AS build

# Create app directory (work directory inside container)
WORKDIR /app

# Copy package.json and lock file first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of your files (src, vite config, etc.)
COPY . .

# Build the app (outputs to /app/dist by default)
RUN npm run build

# 2) Production stage
FROM nginx:alpine

# Remove default Nginx website
RUN rm /etc/nginx/conf.d/default.conf

# Copy over your custom Nginx config
# (See "3. The Nginx config" section below for an example)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 in the container
EXPOSE 80

# Launch Nginx
CMD ["nginx", "-g", "daemon off;"]
