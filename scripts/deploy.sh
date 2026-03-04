#!/bin/bash

# Hilton Restaurant Reservation System Deployment Script
# This script builds and deploys the complete system using Docker Compose

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "Docker and Docker Compose are installed"
}

# Check if required ports are available
check_ports() {
    local ports=("80" "443" "5000" "3000" "27017" "6379" "8080")
    local occupied_ports=()
    
    for port in "${ports[@]}"; do
        if command -v netstat &> /dev/null; then
            if netstat -tuln | grep -q ":${port} "; then
                occupied_ports+=("$port")
            fi
        elif command -v ss &> /dev/null; then
            if ss -tuln | grep -q ":${port} "; then
                occupied_ports+=("$port")
            fi
        fi
    done
    
    if [ ${#occupied_ports[@]} -gt 0 ]; then
        log_warning "The following ports are already in use: ${occupied_ports[*]}"
        read -p "Do you want to continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Load environment variables
load_env() {
    local env_file=".env"
    
    if [ -f "$env_file" ]; then
        log_info "Loading environment variables from $env_file"
        export $(grep -v '^#' "$env_file" | xargs)
    else
        log_warning "No .env file found. Using default values."
        cp .env.example .env 2>/dev/null || true
    fi
}

# Build and start services
deploy_services() {
    log_info "Building and starting services..."
    
    # Build images
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    log_success "Services started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts"
        
        # Check backend health
        if curl -f http://localhost:5000/health > /dev/null 2>&1; then
            log_success "Backend is healthy"
            
            # Check frontend health
            if curl -f http://localhost:3000 > /dev/null 2>&1; then
                log_success "Frontend is healthy"
                return 0
            else
                log_info "Frontend not ready yet, waiting..."
            fi
        else
            log_info "Backend not ready yet, waiting..."
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "Services did not become healthy in time"
    exit 1
}

# Show deployment information
show_info() {
    echo ""
    echo "================================================"
    echo "🚀 Hilton Restaurant Reservation System Deployed"
    echo "================================================"
    echo ""
    echo "📊 Services Status:"
    echo "-------------------"
    docker-compose ps
    echo ""
    echo "🌐 Access Points:"
    echo "-----------------"
    echo "• Frontend Application: ${GREEN}http://localhost:3000${NC}"
    echo "• Backend API: ${GREEN}http://localhost:5000${NC}"
    echo "• GraphQL Playground: ${GREEN}http://localhost:5000/graphql${NC}"
    echo "• MongoDB: ${GREEN}mongodb://localhost:27017${NC}"
    echo "• Adminer (Database UI): ${GREEN}http://localhost:8080${NC}"
    echo ""
    echo "🔧 Management Commands:"
    echo "----------------------"
    echo "• View logs: ${YELLOW}docker-compose logs -f${NC}"
    echo "• Stop services: ${YELLOW}docker-compose down${NC}"
    echo "• Restart services: ${YELLOW}docker-compose restart${NC}"
    echo "• View resource usage: ${YELLOW}docker-compose stats${NC}"
    echo ""
    echo "📝 Quick Start:"
    echo "---------------"
    echo "1. Open ${GREEN}http://localhost:3000${NC} in your browser"
    echo "2. Register as a new user or login"
    echo "3. Create a reservation"
    echo "4. For employee access, login with employee/admin credentials"
    echo ""
    echo "🛠️  Development Commands:"
    echo "-------------------------"
    echo "• Backend development: ${YELLOW}cd backend && npm run dev${NC}"
    echo "• Frontend development: ${YELLOW}cd frontend && npm run dev${NC}"
    echo "• Run tests: ${YELLOW}cd backend && npm test${NC}"
    echo ""
    echo "🔒 Security Notes:"
    echo "------------------"
    echo "• Change default passwords in .env file"
    echo "• Use HTTPS in production"
    echo "• Regularly update dependencies"
    echo ""
    echo "📞 Support:"
    echo "-----------"
    echo "• Check logs: ${YELLOW}docker-compose logs${NC}"
    echo "• Restart services: ${YELLOW}docker-compose restart${NC}"
    echo "• Full reset: ${YELLOW}docker-compose down -v && ./scripts/deploy.sh${NC}"
    echo ""
    echo "================================================"
}

# Main deployment function
main() {
    log_info "Starting Hilton Restaurant Reservation System Deployment"
    log_info "Date: $(date)"
    log_info "Working directory: $(pwd)"
    
    # Check prerequisites
    check_docker
    check_ports
    
    # Load environment
    load_env
    
    # Deploy services
    deploy_services
    
    # Wait for services to be ready
    wait_for_services
    
    # Show deployment information
    show_info
    
    log_success "Deployment completed successfully!"
}

# Handle script interruption
cleanup() {
    log_warning "Deployment interrupted. Cleaning up..."
    docker-compose down
    exit 1
}

# Set trap for cleanup
trap cleanup INT TERM

# Run main function
main "$@"