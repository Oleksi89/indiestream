FROM nginx:alpine
# Copy the compiled Vite files to the standard Nginx folder
COPY dist /usr/share/nginx/html

# Config to support React Router
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]