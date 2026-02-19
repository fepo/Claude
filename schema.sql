-- ================================================================
-- CONTESTAÇÃO SAAS - PostgreSQL Schema (Supabase Compatible)
-- ================================================================
-- Tables: chargebacks, orders, webhook_logs, defenses, notifications
-- Version: 1.0
-- Date: 2026-02-19

-- ================================================================
-- 1. TABLE: chargebacks
-- Disputas recebidas via webhook Pagar.me
-- ================================================================
CREATE TABLE IF NOT EXISTS chargebacks (
  id BIGSERIAL PRIMARY KEY,
  chargeback_id VARCHAR(255) NOT NULL UNIQUE,
  order_id VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  reason VARCHAR(100) NOT NULL, -- produto_nao_recebido, fraude, desacordo_comercial, credito_nao_processado
  status VARCHAR(50) DEFAULT 'open', -- open, won, lost, responded, disputed
  metadata JSONB, -- Dados brutos da Pagar.me API response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chargebacks_chargeback_id ON chargebacks(chargeback_id);
CREATE INDEX idx_chargebacks_order_id ON chargebacks(order_id);
CREATE INDEX idx_chargebacks_status ON chargebacks(status);
CREATE INDEX idx_chargebacks_created_at ON chargebacks(created_at DESC);

-- ================================================================
-- 2. TABLE: orders
-- Pedidos com dados do cliente (Pagar.me + Shopify enriquecido)
-- ================================================================
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_cpf VARCHAR(14), -- Formato: 12345678901-23
  customer_address JSONB, -- { street, number, city, state, zip, country }
  customer_ip VARCHAR(45), -- IPv4 ou IPv6
  customer_metadata JSONB, -- Customizações Shopify/Pagar.me
  
  -- Dados de transação
  transaction_date TIMESTAMP WITH TIME ZONE,
  transaction_amount NUMERIC(12, 2),
  currency VARCHAR(3) DEFAULT 'BRL',
  payment_method VARCHAR(50), -- credit_card, pix, boleto, etc
  last_four_digits VARCHAR(4),
  card_brand VARCHAR(50),
  
  -- Dados de fulfillment/entrega
  shipping_status VARCHAR(50), -- pending, processing, shipped, delivered, failed
  tracking_code VARCHAR(255),
  tracking_provider VARCHAR(50), -- shopify, linketrack, melhor_envio, etc
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Metadata Shopify (se disponível)
  shopify_order_id VARCHAR(255),
  shopify_order_name VARCHAR(50),
  shopify_financial_status VARCHAR(50), -- paid, pending, refunded
  shopify_fulfillment_status VARCHAR(50), -- fulfilled, partial, undelivered
  shopify_created_at TIMESTAMP WITH TIME ZONE,
  shopify_metadata JSONB, -- { fulfillments: [...], line_items: [...] }
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ================================================================
-- 3. TABLE: webhook_logs
-- Auditoria de webhooks recebidos (compliance + debugging)
-- ================================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL, -- charge.chargebacked, chargeback.created, chargeback.updated
  webhook_id VARCHAR(255),
  payload JSONB NOT NULL,
  signature_valid BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_processed ON webhook_logs(processed);

-- Auto-cleanup: delete logs older than 30 days
-- (Run as cron job or use Supabase edge function)
-- DELETE FROM webhook_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- ================================================================
-- 4. TABLE: defenses
-- Defesas submetidas (rascunhos + enviadas)
-- ================================================================
CREATE TABLE IF NOT EXISTS defenses (
  id BIGSERIAL PRIMARY KEY,
  chargeback_id VARCHAR(255) NOT NULL,
  
  -- Versão do dossiê
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'drafted', -- drafted, submitted, rejected, accepted
  
  -- Conteúdo
  defense_text TEXT NOT NULL,
  defense_data JSONB, -- Histórico de versões, análises, parecer jurídico
  
  -- Evidências incluídas
  includes_shopify BOOLEAN DEFAULT FALSE,
  includes_tracking BOOLEAN DEFAULT FALSE,
  includes_base_legal BOOLEAN DEFAULT TRUE,
  
  -- Análise jurídica
  legal_analysis JSONB, -- { parecer: "...", argumentos: [...], recomendacao: "..." }
  viability_score NUMERIC(3, 2), -- 0.0 a 1.0 (confiança da defesa)
  
  -- PDF/Export
  pdf_url VARCHAR(1024),
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_by VARCHAR(255), -- user_id ou 'system'
  submitted_by VARCHAR(255),
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_defenses_chargeback_id ON defenses(chargeback_id);
CREATE INDEX idx_defenses_status ON defenses(status);
CREATE INDEX idx_defenses_viability_score ON defenses(viability_score DESC);
CREATE INDEX idx_defenses_created_at ON defenses(created_at DESC);

-- ================================================================
-- 5. TABLE: notifications
-- Histórico de notificações (email, Slack, SMS)
-- ================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  chargeback_id VARCHAR(255),
  defense_id BIGINT,
  
  type VARCHAR(50) NOT NULL, -- email, slack, sms
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, delivered
  error_message TEXT,
  
  metadata JSONB, -- { email_id, slack_ts, sms_sid, etc }
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_chargeback_id ON notifications(chargeback_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ================================================================
-- 6. FOREIGN KEYS
-- ================================================================
ALTER TABLE defenses
  ADD CONSTRAINT fk_defenses_chargebacks
  FOREIGN KEY (chargeback_id) REFERENCES chargebacks(chargeback_id)
  ON DELETE CASCADE;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_chargebacks
  FOREIGN KEY (chargeback_id) REFERENCES chargebacks(chargeback_id)
  ON DELETE CASCADE;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_defenses
  FOREIGN KEY (defense_id) REFERENCES defenses(id)
  ON DELETE CASCADE;

-- ================================================================
-- 7. TRIGGERS - Auto-update timestamps
-- ================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chargebacks_update
  BEFORE UPDATE ON chargebacks
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_orders_update
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_defenses_update
  BEFORE UPDATE ON defenses
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_notifications_update
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ================================================================
-- 8. SEED DATA (Opcional - para testes)
-- ================================================================
-- INSERT INTO chargebacks (chargeback_id, order_id, amount, reason, metadata)
-- VALUES (
--   'chg_test_001',
--   '1001',
--   299.99,
--   'produto_nao_recebido',
--   '{"id":"chg_test_001","status":"open","created_at":"2026-02-19T10:00:00Z"}'::JSONB
-- );
