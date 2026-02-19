-- ================================================================
-- SEED DATA - Dados de Teste para Desenvolvimento
-- ================================================================
-- Execute este arquivo apenas em DESENVOLVIMENTO
-- Para produção, use dados reais da Pagar.me
-- 
-- psql $DATABASE_URL < scripts/seed-db.sql

-- ================================================================
-- 1. Dados de Teste - Chargebacks
-- ================================================================

INSERT INTO chargebacks (
  chargeback_id, order_id, amount, currency, reason, status, metadata, created_at
) VALUES
  (
    'chg_test_001',
    '1001',
    299.99,
    'BRL',
    'produto_nao_recebido',
    'open',
    '{
      "id": "chg_test_001",
      "charge_id": "ch_123456",
      "amount": 29999,
      "currency": "brl",
      "reason": "produto_nao_recebido",
      "status": "open",
      "created_at": "2026-02-10T10:00:00Z"
    }'::jsonb,
    '2026-02-10 10:00:00'
  ),
  (
    'chg_test_002',
    '1002',
    150.00,
    'BRL',
    'fraude',
    'open',
    '{
      "id": "chg_test_002",
      "charge_id": "ch_123457",
      "amount": 15000,
      "currency": "brl",
      "reason": "fraude",
      "status": "open",
      "created_at": "2026-02-11T14:30:00Z"
    }'::jsonb,
    '2026-02-11 14:30:00'
  ),
  (
    'chg_test_003',
    '1003',
    89.90,
    'BRL',
    'desacordo_comercial',
    'open',
    '{
      "id": "chg_test_003",
      "charge_id": "ch_123458",
      "amount": 8990,
      "currency": "brl",
      "reason": "desacordo_comercial",
      "status": "open",
      "created_at": "2026-02-12T09:15:00Z"
    }'::jsonb,
    '2026-02-12 09:15:00'
  );

-- ================================================================
-- 2. Dados de Teste - Orders
-- ================================================================

INSERT INTO orders (
  order_id, customer_name, customer_email, customer_phone, customer_cpf,
  transaction_date, transaction_amount, currency, payment_method,
  last_four_digits, card_brand, shipping_status, tracking_code,
  tracking_provider, estimated_delivery_date, actual_delivery_date, created_at
) VALUES
  (
    '1001',
    'João Silva',
    'joao@example.com',
    '11999999999',
    '12345678901-23',
    '2026-01-15 10:00:00',
    299.99,
    'BRL',
    'credit_card',
    '1234',
    'Visa',
    'delivered',
    'BR123456789',
    'correios',
    '2026-01-20',
    '2026-01-20',
    '2026-01-15 10:05:00'
  ),
  (
    '1002',
    'Maria Santos',
    'maria@example.com',
    '11988888888',
    '98765432109-87',
    '2026-02-06 14:30:00',
    150.00,
    'BRL',
    'credit_card',
    '5678',
    'Mastercard',
    'pending',
    NULL,
    NULL,
    '2026-02-12',
    NULL,
    '2026-02-06 14:35:00'
  ),
  (
    '1003',
    'Carlos Oliveira',
    'carlos@example.com',
    '11987654321',
    '11144477788-99',
    '2026-01-25 09:15:00',
    89.90,
    'BRL',
    'credit_card',
    '9012',
    'Elo',
    'delivered',
    'BR987654321',
    'sedex',
    '2026-01-28',
    '2026-01-28',
    '2026-01-25 09:20:00'
  );

-- ================================================================
-- 3. Dados de Teste - Webhook Logs
-- ================================================================

INSERT INTO webhook_logs (
  event_type, webhook_id, payload, signature_valid, created_at, processed
) VALUES
  (
    'charge.chargebacked',
    'hook_test_001',
    '{
      "id": "evt_123",
      "type": "charge.chargebacked",
      "data": {
        "chargeback_id": "chg_test_001",
        "charge_id": "ch_123456",
        "amount": 29999,
        "reason": "produto_nao_recebido"
      },
      "created_at": "2026-02-10T10:00:00Z"
    }'::jsonb,
    true,
    '2026-02-10 10:00:00',
    true
  ),
  (
    'charge.chargebacked',
    'hook_test_002',
    '{
      "id": "evt_124",
      "type": "charge.chargebacked",
      "data": {
        "chargeback_id": "chg_test_002",
        "charge_id": "ch_123457",
        "amount": 15000,
        "reason": "fraude"
      },
      "created_at": "2026-02-11T14:30:00Z"
    }'::jsonb,
    true,
    '2026-02-11 14:30:00',
    true
  );

-- ================================================================
-- 4. Dados de Teste - Defenses
-- ================================================================

INSERT INTO defenses (
  chargeback_id, status, defense_text, defense_data, includes_shopify,
  legal_analysis, viability_score, created_by, created_at
) VALUES
  (
    'chg_test_001',
    'drafted',
    'PARECER JURÍDICO - Análise de Chargeback

Contratação nº chg_test_001
Data: 10/02/2026
Valor: R$ 299,99

O presente parecer fundamenta-se nas disposições do Código de Defesa do Consumidor (Lei 8.078/90), especificamente:

Art. 42-A, CDC: "A cobrança de débito já pago pelo consumidor será imediatamente cancelada..."

Art. 49, CDC: "O consumidor pode desistir do contrato, no prazo de 7 dias a contar de sua assinatura ou do ato de recebimento do produto..."

CONCLUSÃO: Recomenda-se responder ao chargeback com comprovação de entrega.',
    '{
      "tipo": "produto_nao_recebido",
      "viabilidade": 0.92,
      "motivo": "Produto rastreado e entregue há 21 dias"
    }'::jsonb,
    false,
    '{
      "parecer": "Conforme análise acima",
      "argumentos": ["Entrega comprovada", "Fora do prazo de arrependimento"],
      "recomendacao": "Responder chargeback"
    }'::jsonb,
    0.92,
    'system',
    '2026-02-10 10:05:00'
  );

-- ================================================================
-- 5. Dados de Teste - Notifications
-- ================================================================

INSERT INTO notifications (
  chargeback_id, type, recipient, subject, body, status, created_at
) VALUES
  (
    'chg_test_001',
    'email',
    'admin@example.com',
    'Novo Chargeback: chg_test_001',
    'Um novo chargeback foi recebido. Viabilidade: 92%',
    'sent',
    '2026-02-10 10:01:00'
  ),
  (
    'chg_test_001',
    'slack',
    '#chargebacks',
    '🚨 Novo Chargeback',
    'Chargeback chg_test_001 recebido. Valor: R$ 299,99',
    'sent',
    '2026-02-10 10:02:00'
  );

-- ================================================================
-- Verificação
-- ================================================================

-- Contar registros inseridos:
SELECT 
  (SELECT COUNT(*) FROM chargebacks) AS chargebacks_count,
  (SELECT COUNT(*) FROM orders) AS orders_count,
  (SELECT COUNT(*) FROM webhook_logs) AS webhook_logs_count,
  (SELECT COUNT(*) FROM defenses) AS defenses_count,
  (SELECT COUNT(*) FROM notifications) AS notifications_count;

-- Output esperado:
--  chargebacks_count | orders_count | webhook_logs_count | defenses_count | notifications_count
-- ------------------+--------------+--------------------+----------------+---------------------
--                  3 |            3 |                  2 |              1 |                   2
