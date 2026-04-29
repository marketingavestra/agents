#!/usr/bin/env bash
# watch.sh - Real-time monitoring for Copiloto-Advogacia

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function check_service() {
    local url=$1
    local name=$2
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 2 || echo "DOWN")
    if [[ "$status" == "200" || "$status" == "404" || "$status" == "302" ]]; then
        echo -e "${name}: [${GREEN}ONLINE${NC}] (HTTP $status)"
    else
        echo -e "${name}: [${RED}OFFLINE${NC}] ($status)"
    fi
}

echo -e "${CYAN}--- Iniciando Copiloto-Advogacia ---${NC}"

# Check for .env files
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}[AVISO] backend/.env não encontrado. Verifique se as variáveis de ambiente estão configuradas.${NC}"
fi

# Start containers
echo -e "${YELLOW}[INFO] Garantindo que os containers estão rodando...${NC}"
docker-compose up -d --build

echo -e "${GREEN}[OK] Containers iniciados. Entrando em modo de monitoramento...${NC}"
sleep 2

# Cleanup on exit
trap "echo -e '\n${YELLOW}Saindo do monitor... (Containers continuam rodando)${NC}'; exit" INT

while true; do
    clear
    echo -e "${CYAN}====================================================${NC}"
    echo -e "${CYAN}   COPILOTO-ADVOGACIA - MONITORAMENTO EM TEMPO REAL  ${NC}"
    echo -e "${CYAN}====================================================${NC}"
    echo -e "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    echo -e "${YELLOW}STATUS DOS SERVIÇOS:${NC}"
    check_service "http://localhost:4000/health" "Backend "
    check_service "http://localhost:3000" "Frontend"
    echo ""

    echo -e "${YELLOW}RECURSOS DOS CONTAINERS:${NC}"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "backend|frontend" || echo "Nenhum container encontrado."
    
    echo ""
    echo -e "${YELLOW}ANÁLISE DE LOGS RECENTES (Erros/Avisos):${NC}"
    # Mostra logs que contenham erro ou aviso, com cor
    docker-compose logs --tail=20 | grep -iE "error|warn|exception|fail|400|500" --color=always || echo "Sem erros recentes nos logs."

    echo ""
    echo -e "${CYAN}----------------------------------------------------${NC}"
    echo -e "DICA: Para ver todos os logs, use: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "Pressione ${RED}Ctrl+C${NC} para fechar este monitor."
    
    sleep 5
done
