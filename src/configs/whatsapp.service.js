const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const NOTIFY_NUMBER = process.env.NOTIFY_NUMBER; // country code (91) + number

// Finds the Chrome binary installed by `npx puppeteer browsers install chrome`.
// On Render it lives under /opt/render/.cache/puppeteer; locally falls back to
// CHROME_PATH env var or lets puppeteer use its own default.
function getChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const found = execSync(
      "find /opt/render/.cache/puppeteer -name 'chrome' -type f 2>/dev/null | head -1",
      { encoding: 'utf-8' }
    ).trim();
    if (found) return found;
  } catch (_) {}
  return undefined;
}

let client;
let isReady = false;
let pendingQR = null; // base64 data URL served at /api/v1/whatsapp/qr

async function initWhatsApp() {
  // MongoStore needs an open connection — wait if mongoose isn't connected yet
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('open', resolve));
  }

  // RemoteAuth writes a temp zip here before syncing to MongoDB — must exist
  const dataPath = path.resolve(__dirname, '../../.wwebjs_auth');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  const store = new MongoStore({ mongoose });

  client = new Client({
    authStrategy: new RemoteAuth({
      clientId: 'hotel-booking',
      store,
      backupSyncIntervalMs: 300000, // persist session to MongoDB every 5 min
      dataPath
    }),
    puppeteer: {
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    },
    webVersion: '2.3000.1015901307',
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901307.html'
    }
  });

  client.on('qr', async (qr) => {
    pendingQR = await QRCode.toDataURL(qr);
    console.log('WhatsApp QR ready — open /api/v1/whatsapp/qr in a browser to scan');
  });

  client.on('ready', () => {
    isReady = true;
    pendingQR = null;
    console.log('✅  WhatsApp client is ready — booking notifications enabled');
  });

  client.on('auth_failure', (msg) => {
    isReady = false;
    console.error('WhatsApp auth failed:', msg);
  });

  client.on('disconnected', () => {
    isReady = false;
    console.warn('WhatsApp client disconnected — booking notifications paused');
  });

  client.initialize();
}

function getWhatsAppStatus() {
  return { ready: isReady, qr: pendingQR };
}

async function logoutWhatsApp() {
  if (!client) throw new Error('WhatsApp client is not initialized');
  await client.logout(); // disconnects + wipes session from MongoDB store
  isReady = false;
  pendingQR = null;
}

async function sendBookingNotification(details) {
  if (!isReady) {
    console.warn('WhatsApp not ready — skipping notification for booking:', details.bookingId);
    return;
  }

  const aadharLine = details.guestAadhar
    ? `\n🪪 Aadhar  : ${details.guestAadhar}`
    : '';

  const datesLine = Array.isArray(details.bookingDates) && details.bookingDates.length
    ? details.bookingDates.map((d) => new Date(d).toISOString().slice(0, 10)).join(', ')
    : 'N/A';

  const message = [
    '🏨 *New Room Booking Alert!*',
    '',
    `👤 Guest Name : ${details.guestName}`,
    `📱 Mobile     : ${details.guestMobile}${aadharLine}`,
    '',
    `🛏️ Room       : ${details.roomName}`,
    `🏷️ Room Type  : ${details.roomType}`,
    `💰 Price/night: ₹${details.roomPrice}`,
    '',
    `📅 Dates      : ${datesLine}`,
    `🔖 Booking ID : ${details.bookingId}`,
    '',
    '⏳ Status: *Pending Confirmation*'
  ].join('\n');

  try {
    const chatId = await client.getNumberId(NOTIFY_NUMBER);
    if (!chatId) {
      console.error('WhatsApp: number not found —', NOTIFY_NUMBER);
      return;
    }
    await client.sendMessage(chatId._serialized, message);
    console.log(`WhatsApp notification sent for booking ${details.bookingId}`);
  } catch (err) {
    console.error('Failed to send WhatsApp notification:', err.message);
  }
}

async function sendStatusUpdateNotification(details) {
  if (!isReady) {
    console.warn('WhatsApp not ready — skipping status notification for booking:', details.bookingId);
    return;
  }

  const statusMap = {
    approved: '✅ *APPROVED* — Your booking has been confirmed! We look forward to welcoming you.',
    rejected: '❌ *REJECTED* — Unfortunately your booking could not be confirmed. Please contact us.',
    'in-reviews': '🔍 *STAY COMPLETED* — Thank you for staying with us! Please share your review.'
  };

  const statusLine = statusMap[details.newStatus] || `Status updated to: *${details.newStatus}*`;

  const datesLine = Array.isArray(details.bookingDates) && details.bookingDates.length
    ? details.bookingDates.map((d) => new Date(d).toISOString().slice(0, 10)).join(', ')
    : 'N/A';

  const message = [
    '🏨 *Booking Status Update*',
    '',
    statusLine,
    '',
    `🛏️ Room       : ${details.roomName}`,
    `🏷️ Room Type  : ${details.roomType}`,
    `📅 Dates      : ${datesLine}`,
    `🔖 Booking ID : ${details.bookingId}`
  ].join('\n');

  // normalize to international format — prefix 91 if plain 10-digit Indian number
  const raw = String(details.guestMobile).replace(/\D/g, '');
  const number = raw.length === 10 ? `91${raw}` : raw;

  try {
    const chatId = await client.getNumberId(number);
    if (!chatId) {
      console.error('WhatsApp: guest number not found —', number);
      return;
    }
    await client.sendMessage(chatId._serialized, message);
    console.log(`WhatsApp status notification sent to ${number} for booking ${details.bookingId}`);
  } catch (err) {
    console.error('Failed to send WhatsApp status notification:', err.message);
  }
}

module.exports = { initWhatsApp, getWhatsAppStatus, logoutWhatsApp, sendBookingNotification, sendStatusUpdateNotification };
