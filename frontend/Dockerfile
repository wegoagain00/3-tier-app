# Stage 1: Using a lightweight Nginx image as the base
# Nginx is a high-performance web server, perfect for serving static files.
# 'alpine' is a minimal Docker image based on Alpine Linux, making our final image very small.
FROM nginx:1.25-alpine

# Remove the default Nginx configuration file
RUN rm /etc/nginx/conf.d/default.conf

# When the container starts, it will serve files from this directory.
# Copying our single HTML file into this directory.
COPY index.html /usr/share/nginx/html/index.html

# Expose port 80 to allow traffic to the web server
EXPOSE 80

# The command to run when the container starts.
# 'nginx -g "daemon off;"' starts Nginx in the foreground, which is standard practice for containers.
CMD ["nginx", "-g", "daemon off;"]
