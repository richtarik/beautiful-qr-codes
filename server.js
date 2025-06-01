const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// TrustPay configuration
const TRUSTPAY_CONFIG = {
    merchantId: process.env.TRUSTPAY_MERCHANT_ID || 'YOUR_TRUSTPAY_MERCHANT_ID',
    secretKey: process.env.TRUSTPAY_SECRET_KEY || 'YOUR_TRUSTPAY_SECRET_KEY',
    baseUrl: 'https://ib.trustpay.eu/mapi5'
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

// TrustPay success callback
app.get('/success', async (req, res) => {
    try {
        const { session: orderId, PaymentRequestId, Result } = req.query;

        if (!orderId) {
            return res.status(400).send('Missing order ID');
        }

        const db = await readDatabase();
        const order = db.orders[orderId];

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Verify payment with TrustPay (simplified - in production should verify signature)
        if (Result === '0' || Result === 0) { // TrustPay success code
            // Mark order as paid
            order.paid = true;
            order.status = 'completed';
            order.paymentId = PaymentRequestId;
            order.completedAt = new Date().toISOString();

            // Create session
            const sessionData = {
                sessionToken: order.sessionToken,
                email: order.email,
                credits: order.credits,
                orderId: order.orderId,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            };

            db.sessions[order.sessionToken] = sessionData;
            await writeDatabase(db);

            // Send email with access link
            await sendAccessEmail(order.email, order.sessionToken, order.credits);

            // Redirect to app with session parameters
            const redirectUrl = `/?session=${order.sessionToken}&credits=${order.credits}&email=${encodeURIComponent(order.email)}`;
            res.redirect(redirectUrl);

        } else {
            // Payment failed
            order.status = 'failed';
            order.failureReason = req.query.ErrorMessage || 'Unknown error';
            await writeDatabase(db);

            res.redirect('/error?reason=payment_failed');
        }

    } catch (error) {
        console.error('Error processing success callback:', error);
        res.status(500).send('Internal server error');
    }
});

// TrustPay error callback
app.get('/error', (req, res) => {
    const reason = req.query.reason || 'payment_failed';
    const message = reason === 'payment_failed' ?
        'Platba sa nepodarila. Skúste to znovu.' :
        'Nastala chyba. Kontaktujte podporu.';

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Chyba platby</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #d32f2f; }
                .btn { background: #6c5ce7; color: white; padding: 10px 20px; border: none; border-radius: 5px; text-decoration: none; }
            </style>
        </head>
        <body>
            <h1 class="error">❌ ${message}</h1>
            <p>Ak problém pretrváva, kontaktujte našu podporu.</p>
            <a href="/" class="btn">Späť na hlavnú stránku</a>
        </body>
        </html>
    `);
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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