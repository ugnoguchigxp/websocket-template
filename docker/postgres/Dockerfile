FROM postgres:16-alpine

# Create SSL directory
RUN mkdir -p /var/lib/postgresql/ssl

# Copy initialization script
COPY init-ssl.sh /docker-entrypoint-initdb.d/

# Set permissions for initialization script
RUN chmod +x /docker-entrypoint-initdb.d/init-ssl.sh

# Expose PostgreSQL port
EXPOSE 5432
