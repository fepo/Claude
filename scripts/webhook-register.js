#!/usr/bin/env node

/**
 * ================================================================
 * WEBHOOK REGISTRATION SCRIPT - Pagar.me v5
 * ================================================================
 * Registers chargeback webhooks with Pagar.me API
 * 
 * Usage:
 *   node scripts/webhook-register.js
 * 
 * Requirements:
 *   - PAGARME_API_KEY in .env.local
 *   - PAGARME_WEBHOOK_URL in .env.local
 *   - PAGARME_WEBHOOK_SECRET in .env.local (if updating)
 */

require('dotenv').config({ path: '.env.local' });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');

const PAGARME_API_KEY = process.env.PAGARME_API_KEY;
const PAGARME_WEBHOOK_URL = process.env.PAGARME_WEBHOOK_URL;
const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

async function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  await log('🔗 Pagar.me Webhook Registration', 'blue');
  await log('================================\n', 'blue');

  // Validation
  if (!PAGARME_API_KEY) {
    await log('❌ Error: PAGARME_API_KEY not found in .env.local', 'red');
    process.exit(1);
  }

  if (!PAGARME_WEBHOOK_URL) {
    await log('❌ Error: PAGARME_WEBHOOK_URL not found in .env.local', 'red');
    await log('\nExample:', 'yellow');
    await log('PAGARME_WEBHOOK_URL=https://yourdomain.com/api/pagarme/chargebacks\n', 'yellow');
    process.exit(1);
  }

  await log(`✓ API Key: ${PAGARME_API_KEY.substring(0, 10)}...`, 'green');
  await log(`✓ Webhook URL: ${PAGARME_WEBHOOK_URL}\n`, 'green');

  try {
    // Criar webhook
    await log('Creating webhook...', 'blue');

    const webhookPayload = {
      url: PAGARME_WEBHOOK_URL,
      // Eventos a serem monitorados
      events: [
        'charge.chargebacked',      // Chargeback criado
        'charge.chargeback_updated' // Status mudou
      ],
      // Headers customizados (opcional)
      headers: {
        'X-API-Version': '2026-02-19'
      }
    };

    const registerResponse = await fetch(
      `${PAGARME_BASE_URL}/webhooks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${PAGARME_API_KEY}:`).toString('base64')}`
        },
        body: JSON.stringify(webhookPayload)
      }
    );

    if (!registerResponse.ok) {
      const error = await registerResponse.text();
      await log(`❌ Failed to register webhook: ${registerResponse.status}`, 'red');
      await log(`Response: ${error}`, 'red');
      process.exit(1);
    }

    const webhook = await registerResponse.json();
    const webhookId = webhook.id;

    await log(`✓ Webhook registered successfully!`, 'green');
    await log(`\nWebhook Details:`, 'blue');
    await log(`  ID: ${webhookId}`, 'green');
    await log(`  URL: ${webhook.url}`, 'green');
    await log(`  Status: ${webhook.status || 'active'}`, 'green');
    await log(`  Events: ${webhook.events ? webhook.events.join(', ') : 'all'}`, 'green');

    // Salvar em .env.local
    const envLocalPath = path.join(process.cwd(), '.env.local');
    let envContent = '';

    if (fs.existsSync(envLocalPath)) {
      envContent = fs.readFileSync(envLocalPath, 'utf-8');
      // Remove existing PAGARME_WEBHOOK_ID se existir
      envContent = envContent.replace(/PAGARME_WEBHOOK_ID=.*/g, '');
    }

    // Adicionar nova entrada
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `PAGARME_WEBHOOK_ID=${webhookId}\n`;

    fs.writeFileSync(envLocalPath, envContent);

    await log(`\n✓ Updated .env.local with webhook ID`, 'green');
    await log(`\nNext steps:`, 'yellow');
    await log(`1. Verify webhook is active in Pagar.me dashboard`, 'yellow');
    await log(`2. Test with: POST /api/pagarme/chargebacks (mock data)`, 'yellow');
    await log(`3. Monitor webhook_logs table in Supabase`, 'yellow');
    await log(`\nWebhook Secret reminder:`, 'yellow');
    await log(`Make sure PAGARME_WEBHOOK_SECRET is set in .env.local`, 'yellow');
    await log(`(used for HMAC SHA-256 validation)`, 'yellow');

  } catch (error) {
    await log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
