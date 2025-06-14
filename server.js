const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Add fetch for older Node.js versions if needed
if (!globalThis.fetch) {
    const fetch = require('node-fetch');
    globalThis.fetch = fetch;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For TrustPay notifications
app.use(express.static('.'));

// TrustPay configuration
const TRUSTPAY_CONFIG = {
    clientId: process.env.TRUSTPAY_CLIENT_ID || process.env.TRUSTPAY_MERCHANT_ID || 'YOUR_TRUSTPAY_CLIENT_ID',
    clientSecret: process.env.TRUSTPAY_CLIENT_SECRET || 'YOUR_TRUSTPAY_CLIENT_SECRET',
    signatureKey: process.env.TRUSTPAY_SECRET_KEY || 'YOUR_TRUSTPAY_SECRET_KEY',
    apiBaseUrl: 'https://sandbox.trustpay.eu/api'
};

// Email configuration
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
    }
});

// Database file path
const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database
async function initDatabase() {
    try {
        await fs.access(DB_FILE);
    } catch (error) {
        // Database doesn't exist, create it
        const initialData = {
            orders: {},
            sessions: {}
        };
        await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('Database initialized');
    }
}

// Read database
async function readDatabase() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { orders: {}, sessions: {} };
    }
}

// Write database
async function writeDatabase(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing database:', error);
    }
}

// Generate unique order ID
function generateOrderId() {
    return 'QR' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Generate session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// API Routes

// Create order
app.post('/api/create-order', async (req, res) => {
    try {
        const { email, credits, amount } = req.body;

        if (!email || !credits || !amount) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const orderId = generateOrderId();
        const sessionToken = generateSessionToken();

        const orderData = {
            orderId,
            sessionToken,
            email,
            credits,
            amount,
            status: 'pending',
            createdAt: new Date().toISOString(),
            paid: false
        };

        const db = await readDatabase();
        db.orders[orderId] = orderData;
        await writeDatabase(db);

        console.log('Order created:', orderId);

        res.json({
            success: true,
            orderId,
            sessionToken
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// TrustPay Callback URL - Server-to-server callback for payment processing (REST API)
app.post('/api/trustpay-callback', async (req, res) => {
    try {
        console.log('TrustPay callback received:', req.body);

        const { status, reference, amount, currency, paymentMethod } = req.body;

        // Process payment based on status
        if (status === 'PAID' || status === 'SUCCESS') {
            // Successful payment - activate session
            const db = await readDatabase();
            const order = db.orders[reference];

            if (order && order.status === 'pending') {
                // Mark order as completed
                order.status = 'completed';
                order.paid = true;
                order.completedAt = new Date().toISOString();

                // Create active session
                const sessionData = {
                    sessionToken: order.sessionToken,
                    email: order.email,
                    credits: order.credits,
                    orderId: order.orderId,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                    lastUsed: new Date().toISOString()
                };

                db.sessions[order.sessionToken] = sessionData;
                await writeDatabase(db);

                // Send access email
                await sendAccessEmail(order.email, order.sessionToken, order.credits);

                console.log(`Payment completed for order: ${reference}`);
            }
        } else {
            // Failed payment - mark order as failed
            const db = await readDatabase();
            const order = db.orders[reference];

            if (order) {
                order.status = 'failed';
                order.failedAt = new Date().toISOString();
                await writeDatabase(db);
                console.log(`Payment failed for order: ${reference}, status: ${status}`);
            }
        }

        // Respond OK to TrustPay
        res.status(200).send('OK');

    } catch (error) {
        console.error('Error processing TrustPay callback:', error);
        res.status(500).send('Internal Server Error');
    }
});

// TrustPay success callback - User redirect
app.get('/success', async (req, res) => {
    const sessionId = req.query.session;

    if (sessionId) {
        // Check if session was activated by notification
        const db = await readDatabase();
        const session = db.sessions[sessionId];

        if (session) {
            // Session is active, show success page with session info
            const successHtml = await fs.readFile(path.join(__dirname, 'success.html'), 'utf8');
            const modifiedHtml = successHtml.replace('{{SESSION_ID}}', sessionId);
            res.send(modifiedHtml);
            return;
        }
    }

    // Default success page
    res.sendFile(path.join(__dirname, 'success.html'));
});

// TrustPay error callback
app.get('/error', (req, res) => {
    console.log('Error callback parameters:', req.query);
    res.sendFile(path.join(__dirname, 'error.html'));
});

// TrustPay cancel callback
app.get('/cancel', (req, res) => {
    res.sendFile(path.join(__dirname, 'cancel.html'));
});

// Deduct credit
app.post('/api/deduct-credit', async (req, res) => {
    try {
        const { sessionId, email } = req.body;

        if (!sessionId || !email) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const db = await readDatabase();
        const session = db.sessions[sessionId];

        if (!session || session.email !== email) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        // Check if session is still valid
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);

        if (now > expiresAt) {
            return res.status(403).json({ success: false, error: 'Session expired' });
        }

        if (session.credits <= 0) {
            return res.status(403).json({ success: false, error: 'No credits remaining' });
        }

        // Deduct credit
        session.credits--;
        session.lastUsed = new Date().toISOString();

        await writeDatabase(db);

        res.json({
            success: true,
            remainingCredits: session.credits
        });

    } catch (error) {
        console.error('Error deducting credit:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get session info
app.get('/api/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const db = await readDatabase();
        const session = db.sessions[sessionId];

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        // Check if session is still valid
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);

        if (now > expiresAt) {
            return res.status(403).json({ success: false, error: 'Session expired' });
        }

        res.json({
            success: true,
            session: {
                credits: session.credits,
                email: session.email,
                expiresAt: session.expiresAt
            }
        });

    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get TrustPay configuration for frontend
app.get('/api/trustpay-config', (req, res) => {
    res.json({
        success: true,
        clientId: TRUSTPAY_CONFIG.clientId,
        apiBaseUrl: TRUSTPAY_CONFIG.apiBaseUrl
    });
});

// Create TrustPay payment using modern REST API
app.post('/api/create-trustpay-payment', async (req, res) => {
    try {
        const { orderId, email, amount, credits } = req.body;

        if (!orderId || !email || !amount || !credits) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Prepare payment payload for TrustPay REST API
        const payload = {
            amount: Math.round(amount * 100), // Convert EUR to cents
            currency: "EUR",
            reference: orderId,
            merchant: {
                name: "Beautiful QR Codes",
                url: `${process.env.BASE_URL || 'https://beautiful-qr-codes.onrender.com'}`
            },
            customer: {
                firstName: "Customer",
                lastName: "User",
                email: email
            },
            callbackUrl: `${process.env.BASE_URL || 'https://beautiful-qr-codes.onrender.com'}/api/trustpay-callback`,
            returnUrl: `${process.env.BASE_URL || 'https://beautiful-qr-codes.onrender.com'}/success?session=${orderId}`
        };

        const jsonPayload = JSON.stringify(payload);
        console.log('TrustPay payload:', jsonPayload);

        // Generate HMAC-SHA256 signature
        const signature = crypto
            .createHmac('sha256', TRUSTPAY_CONFIG.signatureKey)
            .update(jsonPayload)
            .digest('base64');

        // Prepare request headers
        const headers = {
            'Content-Type': 'application/json',
            'Client-Id': TRUSTPAY_CONFIG.clientId,
            'Signature': signature
        };

        console.log('TrustPay headers:', headers);

        // Make request to TrustPay API
        const response = await fetch(`${TRUSTPAY_CONFIG.apiBaseUrl}/payments`, {
            method: 'POST',
            headers: headers,
            body: jsonPayload
        });

        const responseText = await response.text();
        console.log('TrustPay response status:', response.status);
        console.log('TrustPay response:', responseText);

        if (response.status === 201) {
            const data = JSON.parse(responseText);
            res.json({
                success: true,
                redirectUrl: data.redirectUrl
            });
        } else {
            console.error('TrustPay error:', response.status, responseText);
            res.status(400).json({
                success: false,
                error: `TrustPay error: ${response.status}`,
                details: responseText
            });
        }

    } catch (error) {
        console.error('Error creating TrustPay payment:', error);
        res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Send access email
async function sendAccessEmail(email, sessionToken, credits) {
    try {
        const accessLink = `${process.env.BASE_URL || 'http://localhost:3000'}/?session=${sessionToken}&credits=${credits}&email=${encodeURIComponent(email)}`;

        const mailOptions = {
            from: process.env.FROM_EMAIL || 'Beautiful QR Codes <noreply@beautiful-qr.sk>',
            to: email,
            subject: '🎉 Váš Premium prístup k Beautiful QR Codes',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .btn { display: inline-block; background: #6c5ce7; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .credits { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎨 Beautiful QR Codes</h1>
                            <p>Ďakujeme za vašu objednávku!</p>
                        </div>
                        <div class="content">
                            <h2>Váš Premium prístup je pripravený!</h2>
                            <p>Gratulujeme! Úspešne ste si zakúpili Premium prístup k Beautiful QR Codes.</p>
                            
                            <div class="credits">
                                <h3>✨ Vaše kredity: ${credits} Premium QR kód${credits > 1 ? 'ov' : ''}</h3>
                                <p>Platnosť: 24 hodín od nákupu</p>
                            </div>
                            
                            <p><strong>Čo môžete robiť s Premium prístupom:</strong></p>
                            <ul>
                                <li>🎨 Vlastné farby a dizajny</li>
                                <li>✨ Premium šablóny</li>
                                <li>📱 Vysoké rozlíšenie</li>
                                <li>📄 SVG export</li>
                                <li>🎯 Neobmedzené náhľady a úpravy</li>
                            </ul>
                            
                            <div style="text-align: center;">
                                <a href="${accessLink}" class="btn">🚀 Začať vytvárať QR kódy</a>
                            </div>
                            
                            <p><small><strong>Dôležité:</strong> Kredity sa odpočítajú len pri stiahnutí QR kódu. Môžete neobmedzene experimentovať a upravovať dizajn pred stiahnutím.</small></p>
                            
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                            
                            <h3>💾 Záložný prístup</h3>
                            <p>Ak stratíte prístup, môžete sa kedykoľvek vrátiť pomocou tohto linku:</p>
                            <p style="background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all;">${accessLink}</p>
                        </div>
                        <div class="footer">
                            <p>Beautiful QR Codes - Vytvorené s ❤️ na Slovensku</p>
                            <p>Ak máte otázky, napíšte nám na info@beautiful-qr.sk</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await emailTransporter.sendMail(mailOptions);
        console.log('Access email sent to:', email);

    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error - email is not critical for functionality
    }
}

// Initialize and start server
async function startServer() {
    await initDatabase();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`TrustPay Merchant ID: ${TRUSTPAY_CONFIG.merchantId}`);
        console.log('Database initialized successfully');
    });
}

startServer().catch(console.error); 