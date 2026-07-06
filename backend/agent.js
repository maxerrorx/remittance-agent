import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CONFIG
const RECEIVER_NAMETAG = '@receiver-agent';
const BATCH_SIZE = 4;
const FEE_AMOUNT = 0.01;

// STATE
let agentAddress = '0x' + Math.random().toString(16).slice(2, 42);
let agentNametag = '@sender-agent';
let agentWallet = 'mock-wallet-' + Date.now();
let pendingPayments = [];
let processedTransactions = [];
let batchTimer = null;

// LOGGING
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AGENT] ${message}`);
}

// SAVE LOGS
function saveTransactionLog(transaction) {
  const logsDir = path.join(__dirname, '../transaction-logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const filename = path.join(logsDir, `${transaction.txId}.json`);
  fs.writeFileSync(filename, JSON.stringify(transaction, null, 2));
}

function saveBatchLog(batch) {
  const logsDir = path.join(__dirname, '../batch-logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const filename = path.join(logsDir, `${batch.batchId}.json`);
  fs.writeFileSync(filename, JSON.stringify(batch, null, 2));
}

// INIT AGENT
async function initializeAgent() {
  try {
    log('🚀 Initializing Remittance Agent...');
    log(`✅ Agent initialized with mock wallet`);
    log(`📍 Agent Address: ${agentAddress}`);
    log(`🏷️  Agent Nametag: ${agentNametag}`);
    log(`💰 Agent Wallet ID: ${agentWallet}`);
    log(`⏳ Batch threshold: ${BATCH_SIZE} payments`);
    log(`💸 Fee per batch: $${FEE_AMOUNT}`);
  } catch (error) {
    log(`❌ Initialization failed: ${error.message}`);
    process.exit(1);
  }
}

// ADD PAYMENT
async function addPayment(paymentData) {
  try {
    const payment = {
      paymentId: uuidv4(),
      timestamp: new Date().toISOString(),
      sender: paymentData.sender || 'unknown',
      receiver: paymentData.receiver || 'unknown',
      amount: paymentData.amount || 0,
      currency: paymentData.currency || 'USD',
      status: 'pending',
      txHash: null,
    };

    pendingPayments.push(payment);
    log(`💰 Payment received: ID=${payment.paymentId.slice(0, 8)}`);
    log(`   From: ${payment.sender}`);
    log(`   To: ${payment.receiver}`);
    log(`   Amount: ${payment.amount} ${payment.currency}`);
    log(`   Pending: ${pendingPayments.length}/${BATCH_SIZE}`);

    saveTransactionLog({
      ...payment,
      status: 'received',
      stage: 'payment_received',
    });

    if (pendingPayments.length >= BATCH_SIZE) {
      clearTimeout(batchTimer);
      await executeBatch();
    }
  } catch (error) {
    log(`❌ Error adding payment: ${error.message}`);
  }
}

// EXECUTE BATCH
async function executeBatch() {
  if (pendingPayments.length === 0) {
    log('⚠️  No pending payments to batch');
    return null;
  }

  const batchId = `BATCH-${Date.now()}-${uuidv4().slice(0, 8)}`;
  
  try {
    log(`🔄 Executing batch: ${batchId}`);
    
    const totalAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const simulatedTxId = `0x${Date.now().toString(16)}-${uuidv4().slice(0, 8)}`;

    const batch = {
      batchId: batchId,
      timestamp: new Date().toISOString(),
      status: 'completed',
      paymentCount: pendingPayments.length,
      totalAmount: totalAmount,
      fee: FEE_AMOUNT,
      payments: pendingPayments.map(p => ({
        paymentId: p.paymentId,
        sender: p.sender,
        receiver: p.receiver,
        amount: p.amount,
      })),
      transaction: {
        txId: simulatedTxId,
        status: 'sent',
        timestamp: new Date().toISOString(),
      },
    };

    log(`💵 Total payments: $${totalAmount}`);
    log(`💸 Fee (agent keeps): $${FEE_AMOUNT}`);
    log(`✅ [SIMULATED] Payment sent to ${RECEIVER_NAMETAG}`);
    log(`📋 Transaction ID: ${simulatedTxId}`);

    pendingPayments.forEach(payment => {
      payment.status = 'batched';
      payment.txHash = batch.transaction.txId;
      payment.batchId = batchId;

      saveTransactionLog({
        ...payment,
        status: 'batched',
        stage: 'included_in_batch',
        batchId: batchId,
        batchTxId: batch.transaction.txId,
      });
    });

    saveBatchLog(batch);
    processedTransactions.push(batch);
    pendingPayments = [];

    log(`✨ Batch ${batchId} completed successfully`);
    log(`📊 Total batches processed: ${processedTransactions.length}`);

    return batch;
  } catch (error) {
    log(`❌ Batch execution failed: ${error.message}`);
    return null;
  }
}

// API SERVER
function startAPIServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'online',
      agentAddress: agentAddress,
      agentNametag: agentNametag,
      pendingPayments: pendingPayments.length,
      processedBatches: processedTransactions.length,
    });
  });

  app.post('/api/payment', async (req, res) => {
    try {
      const { sender, receiver, amount, currency } = req.body;

      if (!sender || !receiver || !amount) {
        return res.status(400).json({
          error: 'Missing required fields: sender, receiver, amount',
        });
      }

      const paymentData = {
        sender,
        receiver,
        amount: parseFloat(amount),
        currency: currency || 'USD',
      };

      await addPayment(paymentData);

      res.json({
        success: true,
        message: 'Payment received',
        paymentId: pendingPayments[pendingPayments.length - 1].paymentId,
        pending: pendingPayments.length,
        threshold: BATCH_SIZE,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/transactions', (req, res) => {
    const logsDir = path.join(__dirname, '../transaction-logs');
    if (!fs.existsSync(logsDir)) {
      return res.json({ transactions: [] });
    }

    const files = fs.readdirSync(logsDir);
    const transactions = files.map(file => {
      const filePath = path.join(logsDir, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    });

    res.json({ transactions });
  });

  app.listen(PORT, () => {
    log(`🌐 API server running on http://localhost:${PORT}`);
    log(`💳 Submit payments to: POST http://localhost:${PORT}/api/payment`);
  });
}

// MAIN
async function main() {
  try {
    await initializeAgent();
    startAPIServer();

    log(`✅ Agent ready to receive payments`);
    log(`⏳ Waiting for payments...`);

    if (process.env.TEST_MODE === 'true') {
      log(`🧪 TEST MODE: Simulating payments in 5 seconds...`);
      setTimeout(async () => {
        await addPayment({ sender: 'worker1@dubai', receiver: 'family1@india', amount: 100 });
        await addPayment({ sender: 'worker2@dubai', receiver: 'family2@india', amount: 150 });
        await addPayment({ sender: 'worker3@dubai', receiver: 'family3@india', amount: 75 });
        await addPayment({ sender: 'worker4@dubai', receiver: 'family4@india', amount: 200 });
      }, 5000);
    }

    await new Promise(() => {});
  } catch (error) {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  log('🛑 Shutting down gracefully...');
  log(`📊 Final stats: ${processedTransactions.length} batches processed`);
  process.exit(0);
});

main();
