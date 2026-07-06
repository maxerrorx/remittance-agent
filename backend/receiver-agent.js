import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:
# COMPLETE SETUP GUIDE - SCRIPTS 3-10
# Copy each script section into PowerShell one at a time

# ========================================
# SCRIPT 3: Create Receiver Agent
# ========================================

Write-Host "========================================" -ForegroundColor Green
Write-Host "SCRIPT 3: Creating Receiver Agent" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

@'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RECIPIENTS = [
  { id: 'FAMILY001', address: '0xFamily1', name: 'Kumar Family - Bangalore' },
  { id: 'FAMILY002', address: '0xFamily2', name: 'Singh Family - Delhi' },
  { id: 'FAMILY003', address: '0xFamily3', name: 'Patel Family - Mumbai' },
  { id: 'FAMILY004', address: '0xFamily4', name: 'Sharma Family - Hyderabad' },
  { id: 'FAMILY005', address: '0xFamily5', name: 'Gupta Family - Chennai' },
  { id: 'FAMILY006', address: '0xFamily6', name: 'Verma Family - Pune' },
];

let receiverAddress = '0x' + Math.random().toString(16).slice(2, 42);
let receiverNametag = '@receiver-agent';
let processedBatches = [];

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [RECEIVER] ${message}`);
}

function saveDistributionLog(distribution) {
  const logsDir = path.join(__dirname, '../distribution-logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const filename = path.join(logsDir, `DIST-${Date.now()}.json`);
  fs.writeFileSync(filename, JSON.stringify(distribution, null, 2));
  log(`💾 Distribution saved: ${filename}`);
}

async function initializeReceiver() {
  try {
    log('🚀 Initializing Receiver Agent...');
    log(`✅ Receiver Agent initialized`);
    log(`📍 Receiver Address: ${receiverAddress}`);
    log(`🏷️  Receiver Nametag: ${receiverNametag}`);
    log(`👥 Ready to distribute to ${RECIPIENTS.length} families`);

    RECIPIENTS.forEach((r, idx) => {
      log(`   ${idx + 1}. ${r.name}`);
    });

    return { receiverAddress, receiverNametag };
  } catch (error) {
    log(`❌ Initialization failed: ${error.message}`);
    process.exit(1);
  }
}

async function distributePayment(batchData) {
  try {
    log(`💰 Processing batch: ${batchData.batchId}`);
    log(`📥 Received amount: $${batchData.totalAmount}`);

    const amountPerRecipient = batchData.totalAmount / RECIPIENTS.length;
    
    const distribution = {
      batchId: batchData.batchId,
      timestamp: new Date().toISOString(),
      totalReceived: batchData.totalAmount,
      distributions: [],
    };

    log(`💸 Distributing $${amountPerRecipient.toFixed(2)} to each of ${RECIPIENTS.length} families`);

    for (const recipient of RECIPIENTS) {
      const dist = {
        recipientId: recipient.id,
        name: recipient.name,
        address: recipient.address,
        amountDistributed: amountPerRecipient,
        txHash: `0x${Math.random().toString(16).slice(2)}`,
        timestamp: new Date().toISOString(),
        status: 'sent',
      };

      distribution.distributions.push(dist);
      log(`✅ Distributed $${amountPerRecipient.toFixed(2)} to ${recipient.name}`);
    }

    saveDistributionLog(distribution);
    processedBatches.push(distribution);
    log(`✨ Distribution complete`);

    return distribution;
  } catch (error) {
    log(`❌ Distribution failed: ${error.message}`);
  }
}

async function main() {
  try {
    const { receiverAddress, receiverNametag } = await initializeReceiver();

    log(`✅ Receiver agent online and ready`);
    log(`📡 Listening for incoming batches from sender agent...`);
    log(`⏱️  Waiting for sender to batch payments...`);

    setTimeout(async () => {
      const simulatedBatch = {
        batchId: `BATCH-${Date.now()}`,
        totalAmount: 625,
        paymentCount: 4,
        timestamp: new Date().toISOString(),
      };

      log(`🔔 [SIMULATED] Incoming batch received!`);
      await distributePayment(simulatedBatch);
    }, 10000);

    await new Promise(() => {});
  } catch (error) {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  log('🛑 Shutting down...');
  process.exit(0);
});

main();
