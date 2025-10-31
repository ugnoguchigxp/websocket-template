#!/bin/bash
set -e

# Generate internal SSL certificates for Docker containers
# This script generates self-signed certificates for internal communication

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORCE_REGENERATE="${1:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Generating Internal SSL Certificates ==="
echo ""

# Check if openssl is installed
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: openssl is not installed${NC}"
    echo "Please install openssl and try again"
    exit 1
fi

# Function to check certificate expiration
check_cert_expiration() {
    local cert_file=$1
    if [ -f "${cert_file}" ]; then
        local expiry_date=$(openssl x509 -in "${cert_file}" -noout -enddate | cut -d= -f2)
        local expiry_epoch=$(date -j -f "%b %d %T %Y %Z" "${expiry_date}" "+%s" 2>/dev/null || date -d "${expiry_date}" "+%s" 2>/dev/null)
        local current_epoch=$(date "+%s")
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

        if [ ${days_until_expiry} -lt 30 ]; then
            echo -e "   ${YELLOW}Warning: Certificate expires in ${days_until_expiry} days${NC}"
            return 1
        else
            echo -e "   ${GREEN}Certificate valid for ${days_until_expiry} days${NC}"
            return 0
        fi
    fi
    return 1
}

# Generate CA (Certificate Authority)
echo "1. Generating Certificate Authority (CA)..."
if [ ! -f "${SCRIPT_DIR}/certs/ca.key" ] || [ "${FORCE_REGENERATE}" == "--force" ]; then
    mkdir -p "${SCRIPT_DIR}/certs"

    if [ -f "${SCRIPT_DIR}/certs/ca.key" ]; then
        echo -e "   ${YELLOW}Backing up existing CA certificate...${NC}"
        mv "${SCRIPT_DIR}/certs/ca.key" "${SCRIPT_DIR}/certs/ca.key.backup.$(date +%Y%m%d_%H%M%S)"
        mv "${SCRIPT_DIR}/certs/ca.crt" "${SCRIPT_DIR}/certs/ca.crt.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    fi

    openssl genrsa -out "${SCRIPT_DIR}/certs/ca.key" 4096
    openssl req -new -x509 -days 3650 -key "${SCRIPT_DIR}/certs/ca.key" \
        -out "${SCRIPT_DIR}/certs/ca.crt" \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Internal CA/CN=Internal CA"
    chmod 600 "${SCRIPT_DIR}/certs/ca.key"
    chmod 644 "${SCRIPT_DIR}/certs/ca.crt"
    echo -e "   ${GREEN}CA certificate generated.${NC}"
else
    echo "   CA certificate already exists."
    check_cert_expiration "${SCRIPT_DIR}/certs/ca.crt" || echo -e "   ${YELLOW}Consider regenerating with --force flag${NC}"
fi

# Function to generate certificate for a service
generate_cert() {
    local service=$1
    local cn=$2
    local dir="${SCRIPT_DIR}/certs/${service}"

    echo ""
    echo "2. Generating certificate for ${service}..."

    # Check if certificate exists and is still valid
    if [ -f "${dir}/server.crt" ] && [ "${FORCE_REGENERATE}" != "--force" ]; then
        echo "   Certificate already exists."
        if check_cert_expiration "${dir}/server.crt"; then
            echo -e "   ${GREEN}Skipping regeneration. Use --force to regenerate.${NC}"
            return 0
        else
            echo -e "   ${YELLOW}Regenerating due to expiration warning...${NC}"
        fi
    fi

    mkdir -p "${dir}"

    # Backup existing certificates if they exist
    if [ -f "${dir}/server.key" ]; then
        echo -e "   ${YELLOW}Backing up existing certificates...${NC}"
        local backup_suffix="backup.$(date +%Y%m%d_%H%M%S)"
        mv "${dir}/server.key" "${dir}/server.key.${backup_suffix}" 2>/dev/null || true
        mv "${dir}/server.crt" "${dir}/server.crt.${backup_suffix}" 2>/dev/null || true
    fi

    # Generate private key
    openssl genrsa -out "${dir}/server.key" 2048

    # Generate certificate signing request
    openssl req -new -key "${dir}/server.key" \
        -out "${dir}/server.csr" \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=WebSocket Framework/CN=${cn}"

    # Create extensions file for SAN
    cat > "${dir}/server.ext" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${cn}
DNS.2 = localhost
DNS.3 = ${service}
EOF

    # Sign the certificate with CA
    openssl x509 -req -in "${dir}/server.csr" \
        -CA "${SCRIPT_DIR}/certs/ca.crt" \
        -CAkey "${SCRIPT_DIR}/certs/ca.key" \
        -CAcreateserial \
        -out "${dir}/server.crt" \
        -days 3650 \
        -sha256 \
        -extfile "${dir}/server.ext"

    # Copy CA certificate
    cp "${SCRIPT_DIR}/certs/ca.crt" "${dir}/ca.crt"

    # Set permissions
    chmod 600 "${dir}/server.key"
    chmod 644 "${dir}/server.crt"
    chmod 644 "${dir}/ca.crt"

    # Cleanup
    rm "${dir}/server.csr" "${dir}/server.ext"

    echo -e "   ${GREEN}Certificate for ${service} generated at ${dir}/${NC}"

    # Verify the generated certificate
    if openssl verify -CAfile "${SCRIPT_DIR}/certs/ca.crt" "${dir}/server.crt" > /dev/null 2>&1; then
        echo -e "   ${GREEN}Certificate verification: PASSED${NC}"
    else
        echo -e "   ${RED}Certificate verification: FAILED${NC}"
        return 1
    fi
}

# Generate certificates for each service
generate_cert "postgres" "postgres"
generate_cert "api" "api"
generate_cert "web" "web"

echo ""
echo -e "${GREEN}=== Certificate Generation Complete ===${NC}"
echo ""
echo "Generated certificates:"
echo "  - CA: docker/certs/ca.crt"
echo "  - PostgreSQL: docker/certs/postgres/"
echo "  - API: docker/certs/api/"
echo "  - Web: docker/certs/web/"
echo ""
echo -e "${YELLOW}IMPORTANT: These are self-signed certificates for internal communication only.${NC}"
echo "For the public-facing nginx, use proper SSL certificates (e.g., Let's Encrypt)."
echo ""
echo "Usage:"
echo "  ./generate-internal-certs.sh          # Generate certificates (skip if already exist)"
echo "  ./generate-internal-certs.sh --force  # Force regenerate all certificates"
echo ""
echo "Next steps:"
echo "  1. Generate external SSL certificates for nginx (docker/nginx/ssl/)"
echo "  2. Configure environment variables in .env file"
echo "  3. Build and start containers with: docker-compose -f docker-compose.prod.yml up -d"
