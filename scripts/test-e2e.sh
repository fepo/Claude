#!/bin/bash

#######################################################################
# TEST E2E - Teste End-to-End Completo
#
# Simula um chargeback real do webhook até o envio final
#
# Uso: bash scripts/test-e2e.sh
#######################################################################

set -e  # Exit on error

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
API_URL="http://localhost:3000"
WEBHOOK_ENDPOINT="/api/pagarme/chargebacks"
DEFESA_SALVAR_ENDPOINT="/api/defesas/salvar"

# IDs para teste
CHARGEBACK_ID="chargeback_test_$(date +%s)"
CHARGE_ID="charge_test_001"
ORDER_ID="order_test_001"

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TESTE E2E - Chargeback → Defesa → Pagar.me${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

#######################################################################
# PASSO 1: Verificações Iniciais
#######################################################################

echo -e "${YELLOW}[PASSO 1/5] Verificando Pré-Requisitos...${NC}"

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não encontrado${NC}"
    exit 1
fi

# Verificar se servidor está rodando
if ! curl -s "$API_URL" > /dev/null; then
    echo -e "${RED}❌ Servidor não está rodando em $API_URL${NC}"
    echo -e "${YELLOW}   Execute: npm run dev${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm instalado${NC}"
echo -e "${GREEN}✓ Servidor rodando em $API_URL${NC}"

# Verificar se arquivos existem
if [ ! -f "src/app/api/pagarme/chargebacks/route.ts" ]; then
    echo -e "${RED}❌ Arquivo de webhook não encontrado${NC}"
    exit 1
fi

if [ ! -f "src/app/api/defesas/salvar/route.ts" ]; then
    echo -e "${RED}❌ API /api/defesas/salvar não encontrada${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Arquivos de API encontrados${NC}"
echo ""

#######################################################################
# PASSO 2: Enviar Webhook Pagar.me
#######################################################################

echo -e "${YELLOW}[PASSO 2/5] Enviando Webhook Pagar.me...${NC}"

WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "type": "charge.chargebacked",
  "data": {
    "id": "$CHARGEBACK_ID",
    "charge_id": "$CHARGE_ID",
    "order_id": "$ORDER_ID",
    "amount": 15000,
    "reason": "produto_nao_recebido",
    "created_at": "2025-02-19T10:30:00Z",
    "customer": {
      "name": "João Silva Teste",
      "email": "joao.teste@example.com",
      "document": "123.456.789-00",
      "ip": "192.168.1.1"
    },
    "billing_address": {
      "line1": "Rua A",
      "line2": "Apto 123",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01000-000",
      "country": "BR"
    },
    "shipping_address": {
      "line1": "Rua B",
      "line2": "Apt 456",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01000-000",
      "country": "BR"
    },
    "items": [
      {
        "description": "Tênis Esportivo XYZ",
        "amount": 15000,
        "quantity": 1
      }
    ],
    "metadata": {
      "tracking_code": "BR123456789"
    }
  }
}
EOF
)

WEBHOOK_RESPONSE=$(curl -s -X POST "$API_URL$WEBHOOK_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-Pagar-Me-Signature: test_signature" \
  -d "$WEBHOOK_PAYLOAD")

# Verificar resposta
if echo "$WEBHOOK_RESPONSE" | grep -q '"received":true'; then
    echo -e "${GREEN}✓ Webhook recebido com sucesso${NC}"
    echo "  Resposta: $WEBHOOK_RESPONSE"
else
    echo -e "${RED}❌ Webhook não foi recebido${NC}"
    echo "  Resposta: $WEBHOOK_RESPONSE"
    exit 1
fi

echo ""

#######################################################################
# PASSO 3: Simular Defesa do n8n
#######################################################################

echo -e "${YELLOW}[PASSO 3/5] Salvando Defesa (simulado n8n)...${NC}"

DEFESA_PAYLOAD=$(cat <<'EOFDEFESA'
{
  "contestacaoId": "CONTESTACAO_ID_REPLACE",
  "chargebackId": "CHARGE_ID_REPLACE",
  "dossie": "<html><body>Dossiê HTML</body></html>",
  "dossieTitulo": "Dossiê de Defesa - Chargeback CHARGE_ID_REPLACE",
  "dossieMD": "# Dossiê de Defesa\n\n## 1. Informações da Disputa\n\nStatus: Aberto\nMotivo: Produto não recebido\nValor: R$ 150,00\n\n## Base Legal\n\nArt. 49 do CDC: Consumidor tem direito de arrependimento.\n\n✓ Recomendação: RESPONDER ao chargeback",
  "contestacao": {
    "gateway": "pagarme",
    "contestacaoId": "CONTESTACAO_ID_REPLACE",
    "dataContestacao": "2025-02-19",
    "tipoContestacao": "produto_nao_recebido",
    "valorTransacao": "150.00",
    "bandeira": "Visa",
    "finalCartao": "1234",
    "dataTransacao": "2025-02-10",
    "numeroPedido": "ORDER_ID_REPLACE",
    "itensPedido": [{"descricao": "Tênis Esportivo XYZ", "valor": "150.00"}],
    "codigoConfirmacao": "CHARGE_ID_REPLACE",
    "nomeCliente": "João Silva Teste",
    "cpfCliente": "123.456.789-00",
    "emailCliente": "joao.teste@example.com",
    "enderecoEntrega": "Rua B, Apto 456, São Paulo - SP, 01000-000",
    "enderecoFaturamento": "Rua A, Apto 123, São Paulo - SP, 01000-000",
    "ipComprador": "192.168.1.1",
    "transportadora": "Correios",
    "codigoRastreio": "BR123456789",
    "eventosRastreio": [
      {"data": "2025-02-11", "descricao": "Objeto saiu para entrega"},
      {"data": "2025-02-12", "descricao": "Objeto entregue ao destinatário"}
    ],
    "comunicacoes": [],
    "nomeEmpresa": "Sua Loja",
    "cnpjEmpresa": "00.000.000/0000-00",
    "emailEmpresa": "contato@loja.com",
    "telefoneEmpresa": "(11) 3000-0000",
    "enderecoEmpresa": "Rua X, 789, São Paulo - SP",
    "politicaReembolsoUrl": "https://loja.com/politica-reembolso"
  },
  "parecer": {
    "tipo": "produto_nao_recebido",
    "viabilidade": 0.85,
    "parecer": "Art. 49 do CDC. Rastreamento confirma entrega. Cliente não apresentou prova de não recebimento.",
    "argumentos": [
      "Rastreamento confirma entrega",
      "Data de entrega anterior ao chargeback",
      "Cliente não apresentou prova"
    ],
    "recomendacao": "responder",
    "confianca": 0.92
  },
  "source": "n8n"
}
EOFDEFESA
)

# Substituir placeholders
DEFESA_PAYLOAD="${DEFESA_PAYLOAD//CHARGE_ID_REPLACE/$CHARGE_ID}"
DEFESA_PAYLOAD="${DEFESA_PAYLOAD//CONTESTACAO_ID_REPLACE/$CHARGEBACK_ID}"
DEFESA_PAYLOAD="${DEFESA_PAYLOAD//ORDER_ID_REPLACE/$ORDER_ID}"

DEFESA_RESPONSE=$(curl -s -X POST "$API_URL$DEFESA_SALVAR_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$DEFESA_PAYLOAD")

# Verificar resposta
if echo "$DEFESA_RESPONSE" | grep -q '"success":true'; then
    DEFESA_ID=$(echo "$DEFESA_RESPONSE" | grep -o '"defesaId":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Defesa salva com sucesso${NC}"
    echo "  Defesa ID: $DEFESA_ID"
    echo "  Resposta: $DEFESA_RESPONSE"
else
    echo -e "${RED}❌ Defesa não foi salva${NC}"
    echo "  Resposta: $DEFESA_RESPONSE"
    exit 1
fi

echo ""

#######################################################################
# PASSO 4: Verificar Dashboard
#######################################################################

echo -e "${YELLOW}[PASSO 4/5] Verificando Dashboard...${NC}"

DASHBOARD_URL="$API_URL/defesas"
if curl -s "$DASHBOARD_URL" | grep -q "defesas"; then
    echo -e "${GREEN}✓ Dashboard carregando${NC}"
    echo "  URL: $DASHBOARD_URL"
else
    echo -e "${RED}❌ Dashboard não encontrado${NC}"
    exit 1
fi

echo ""

#######################################################################
# PASSO 5: Resumo do Teste
#######################################################################

echo -e "${YELLOW}[PASSO 5/5] Resumo Final${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ TESTE E2E COMPLETADO COM SUCESSO!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

echo -e "IDs Gerados:"
echo -e "  ${BLUE}Chargeback ID${NC}: $CHARGEBACK_ID"
echo -e "  ${BLUE}Charge ID${NC}:     $CHARGE_ID"
echo -e "  ${BLUE}Order ID${NC}:      $ORDER_ID"
echo -e "  ${BLUE}Defesa ID${NC}:     $DEFESA_ID"
echo ""

echo -e "Próximos Passos:"
echo -e "  1. Abra no navegador: ${BLUE}$DASHBOARD_URL${NC}"
echo -e "  2. Procure pela defesa com Chargeback ID: ${BLUE}$CHARGEBACK_ID${NC}"
echo -e "  3. Clique em 'Ver detalhes →'"
echo -e "  4. Revise o parecer e dossiê"
echo -e "  5. Clique em '✓ Enviar para Pagar.me'"
echo -e "  6. Confirme no modal"
echo ""

echo -e "Validações Manuais (via console do navegador):"
echo -e "  ${BLUE}localStorage check${NC}:"
echo -e "    ${YELLOW}const r = JSON.parse(localStorage.getItem('contestacao_rascunhos') || '[]');${NC}"
echo -e "    ${YELLOW}console.log(r[r.length-1]);${NC}"
echo ""

echo -e "URLs Úteis:"
echo -e "  • Dashboard:     ${BLUE}$DASHBOARD_URL${NC}"
echo -e "  • Defesa:        ${BLUE}$DASHBOARD_URL/$DEFESA_ID${NC}"
echo -e "  • Servidor:      ${BLUE}$API_URL${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "Para mais detalhes, veja: TESTE_E2E.md"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
