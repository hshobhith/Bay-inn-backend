const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const NOTIFY_NUMBER = '916366076182'; // country code (91) + number

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'hotel-booking' }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  },
  webVersion: '2.3000.1015901307',
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901307.html'
  }
});

let isReady = false;

client.on('qr', (qr) => {
  console.log('\n========================================');
  console.log('  WhatsApp QR Code — scan with your phone');
  console.log('========================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  isReady = true;
  console.log('✅  WhatsApp client is ready — booking notifications enabled');
});

client.on('auth_failure', (msg) => {
  console.error('WhatsApp auth failed:', msg);
  isReady = false;
});

client.on('disconnected', () => {
  isReady = false;
  console.warn('WhatsApp client disconnected — booking notifications paused');
});

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

function initWhatsApp() {
  client.initialize();
}

module.exports = { initWhatsApp, sendBookingNotification, sendStatusUpdateNotification };
