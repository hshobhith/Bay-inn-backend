const router = require('express').Router();
const { getWhatsAppStatus, logoutWhatsApp } = require('../configs/whatsapp.service');

// GET /api/v1/whatsapp/qr?secret=<WHATSAPP_QR_SECRET>
router.get('/whatsapp/qr', (req, res) => {
  if (req.query.secret !== process.env.WHATSAPP_QR_SECRET) {
    return res.status(401).send('Unauthorized');
  }
  const { ready, qr } = getWhatsAppStatus();

  if (ready) {
    return res.status(200).json({ status: 'ready', message: 'WhatsApp is connected. No QR needed.' });
  }

  if (!qr) {
    return res.status(202).json({ status: 'initializing', message: 'WhatsApp client is still starting up. Try again in a few seconds.' });
  }

  // Return an HTML page so the admin can scan directly in the browser
  return res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>WhatsApp QR Code</title>
        <meta http-equiv="refresh" content="30">
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 40px; background: #f0f2f5; }
          h2 { color: #128C7E; }
          img { border: 8px solid #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
          p { color: #555; margin-top: 16px; }
        </style>
      </head>
      <body>
        <h2>Scan with WhatsApp</h2>
        <img src="${qr}" width="256" height="256" alt="WhatsApp QR Code" />
        <p>Open WhatsApp → Linked Devices → Link a Device → scan this code</p>
        <p><small>This page auto-refreshes every 30 seconds</small></p>
      </body>
    </html>
  `);
});

// DELETE /api/v1/whatsapp/logout?secret=<WHATSAPP_QR_SECRET>
// Disconnects current WhatsApp account and wipes session from MongoDB.
// After this, restart the server and visit /whatsapp/qr to link a new account.
router.delete('/whatsapp/logout', async (req, res) => {
  if (req.query.secret !== process.env.WHATSAPP_QR_SECRET) {
    return res.status(401).send('Unauthorized');
  }
  try {
    await logoutWhatsApp();
    return res.status(200).json({ status: 'success', message: 'WhatsApp logged out. Restart the server, then visit /api/v1/whatsapp/qr to link a new account.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
