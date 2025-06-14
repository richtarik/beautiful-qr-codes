// QR Code Generator functionality
let currentQRCode = null;
let currentQRData = null;
let premiumCredits = 0;
let userEmail = null;
let premiumSession = null;
let selectedTemplate = null;
let currentSessionId = null;
let currentUserEmail = null;
let remainingCredits = 0;
let currentOrderCredits = 1;
let currentOrderAmount = 1.00;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    // Add smooth scrolling
    addSmoothScrolling();

    // Initialize QR generator
    updateInputFields();

    // Check for existing premium session
    checkPremiumSession();
});

// Check for existing premium session (from localStorage or URL params)
function checkPremiumSession() {
    // Check localStorage for session
    const savedSession = localStorage.getItem('premiumSession');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            if (session.expiresAt > Date.now()) {
                activatePremiumSession(session);
                return;
            } else {
                localStorage.removeItem('premiumSession');
            }
        } catch (e) {
            localStorage.removeItem('premiumSession');
        }
    }

    // Check URL params for new session (from email link)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('session');
    const credits = urlParams.get('credits');
    const email = urlParams.get('email');

    if (sessionToken && credits && email) {
        // User came from payment success page
        currentSessionId = sessionToken;
        currentUserEmail = email;
        remainingCredits = parseInt(credits);

        // Store in localStorage for persistence
        localStorage.setItem('premiumSession', JSON.stringify({
            sessionId: sessionToken,
            email: email,
            credits: remainingCredits,
            timestamp: Date.now()
        }));

        showPremiumEditor();
        showSuccessMessage();
    } else {
        // Check localStorage for existing session
        checkExistingSession();
    }
}

function checkExistingSession() {
    const storedSession = localStorage.getItem('premiumSession');
    if (storedSession) {
        try {
            const session = JSON.parse(storedSession);
            const now = Date.now();
            const sessionAge = now - session.timestamp;
            const dayInMs = 24 * 60 * 60 * 1000;

            if (sessionAge < dayInMs && session.credits > 0) {
                // Session is still valid
                currentSessionId = session.sessionId;
                currentUserEmail = session.email;
                remainingCredits = session.credits;
                showPremiumEditor();
            } else {
                // Session expired or no credits left
                localStorage.removeItem('premiumSession');
            }
        } catch (e) {
            localStorage.removeItem('premiumSession');
        }
    }
}

function updateCreditsDisplay() {
    const creditsElement = document.getElementById('credits-count');
    if (creditsElement) {
        creditsElement.textContent = remainingCredits;
    }

    // Hide premium editor if no credits left
    if (remainingCredits <= 0) {
        hidePremiumEditor();
    }
}

function showPremiumEditor() {
    const premiumEditor = document.getElementById('premium-editor');
    if (premiumEditor) {
        premiumEditor.style.display = 'block';
        updateCreditsDisplay();
    }
}

function hidePremiumEditor() {
    const premiumEditor = document.getElementById('premium-editor');
    if (premiumEditor) {
        premiumEditor.style.display = 'none';
    }
}

function showSuccessMessage() {
    const modal = document.getElementById('success-modal');
    const emailSpan = document.getElementById('success-email');
    if (modal && emailSpan) {
        emailSpan.textContent = currentUserEmail;
        modal.style.display = 'block';
    }
}

// Activate premium session
function activatePremiumSession(session) {
    premiumCredits = session.credits;
    premiumSession = session;

    // Show premium editor
    document.getElementById('premium-editor').style.display = 'block';

    // Update credits display
    document.getElementById('credits-count').textContent = premiumCredits;

    // Hide premium purchase section if credits > 0
    if (premiumCredits > 0) {
        document.querySelector('.premium-section').style.display = 'none';
    }

    // Show unlock animation
    showUnlockAnimation();
}

// Show unlock animation
function showUnlockAnimation() {
    const animation = document.createElement('div');
    animation.className = 'premium-unlock-animation';
    animation.innerHTML = `
        <h3>🎉 Premium aktivované!</h3>
        <p>Máte ${premiumCredits} zostávajúcich QR kódov</p>
    `;

    document.body.appendChild(animation);

    setTimeout(() => {
        animation.remove();
    }, 3000);
}

// Buy premium QR codes
function buyPremium(credits) {
    currentOrderCredits = credits;
    currentOrderAmount = credits === 1 ? 1.00 : 4.00;

    const description = `${credits} Premium QR kód${credits > 1 ? 'ov' : ''}`;
    const price = `${currentOrderAmount.toFixed(2)} €`;

    document.getElementById('order-description').textContent = description;
    document.getElementById('order-price').textContent = price;
    document.getElementById('total-price').textContent = price;
    document.getElementById('pay-amount').textContent = price;

    document.getElementById('payment-modal').style.display = 'block';
}

// Close payment modal
function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

// Close success modal
function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
}

// Open premium editor
function openPremiumEditor() {
    closeSuccessModal();
    showPremiumEditor();
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
}

async function processPayment() {
    const email = document.getElementById('customer-email').value;

    if (!email || !validateEmail(email)) {
        alert('Zadajte platnú email adresu');
        return;
    }

    const payButton = document.getElementById('pay-button');
    payButton.disabled = true;
    payButton.innerHTML = '⏳ Spracováva sa...';

    try {
        // Create order in our database
        const orderData = {
            email: email,
            credits: currentOrderCredits,
            amount: currentOrderAmount,
            timestamp: Date.now()
        };

        const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.success) {
            // Create TrustPay payment using modern REST API
            const paymentResponse = await fetch('/api/create-trustpay-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId: result.orderId,
                    email: email,
                    amount: currentOrderAmount,
                    credits: currentOrderCredits
                })
            });

            const paymentResult = await paymentResponse.json();

            if (paymentResult.success) {
                // Redirect to TrustPay payment page
                window.location.href = paymentResult.redirectUrl;
            } else {
                throw new Error(paymentResult.error || 'Chyba pri vytváraní TrustPay platby');
            }
        } else {
            throw new Error(result.error || 'Chyba pri vytváraní objednávky');
        }

    } catch (error) {
        console.error('Payment error:', error);
        alert('Nastala chyba pri spracovaní platby. Skúste to znovu.');

        payButton.disabled = false;
        payButton.innerHTML = `Zaplatiť <span>${currentOrderAmount.toFixed(2)} €</span>`;
    }
}

// Removed old buildTrustPayUrl function - now using modern REST API

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Generate basic (free) QR code
function generateBasicQR() {
    const qrType = document.getElementById('qr-type').value;
    let qrData = getQRData(qrType);

    if (!qrData) {
        alert('Prosím zadaj obsah pre QR kód');
        return;
    }

    // Store current data
    currentQRData = { type: qrType, data: qrData };

    // Generate basic black QR code
    generateQRCode(qrData, {
        size: 300,
        background: '#ffffff',
        foreground: '#000000'
    });
}

// Generate premium QR code
function generatePremiumQR() {
    if (remainingCredits <= 0) {
        alert('Nemáte dostatok kreditov. Zakúpte si Premium prístup.');
        return;
    }

    const qrType = document.getElementById('qr-type').value;
    let qrData = getQRData(qrType);

    if (!qrData) {
        alert('Prosím zadaj obsah pre QR kód');
        return;
    }

    // Get premium settings
    const foregroundColor = document.getElementById('qr-foreground').value;
    const backgroundColor = document.getElementById('qr-background').value;
    const qrSize = parseInt(document.getElementById('qr-size').value);

    // Store current data
    currentQRData = {
        type: qrType,
        data: qrData,
        premium: true,
        settings: { foregroundColor, backgroundColor, qrSize }
    };

    // Generate premium QR code
    generateQRCode(qrData, {
        size: qrSize,
        background: backgroundColor,
        foreground: foregroundColor
    }, true);
}

// Get QR data based on type
function getQRData(qrType) {
    let qrData = '';

    switch (qrType) {
        case 'text':
            qrData = document.getElementById('qr-content').value.trim();
            break;
        case 'url':
            qrData = document.getElementById('url-content').value.trim();
            if (qrData && !qrData.startsWith('http://') && !qrData.startsWith('https://')) {
                qrData = 'https://' + qrData;
            }
            break;
        case 'wifi':
            const ssid = document.getElementById('wifi-ssid').value.trim();
            const password = document.getElementById('wifi-password').value.trim();
            const security = document.getElementById('wifi-security').value;

            if (!ssid) {
                alert('Prosím zadaj názov WiFi siete (SSID)');
                return null;
            }

            if (security !== 'nopass') {
                qrData = `WIFI:T:${security};S:${ssid};P:${password};;`;
            } else {
                qrData = `WIFI:T:nopass;S:${ssid};;`;
            }
            break;
        case 'email':
            const email = document.getElementById('qr-content').value.trim();
            if (email && email.includes('@')) {
                qrData = `mailto:${email}`;
            } else {
                qrData = email;
            }
            break;
        case 'phone':
            const phone = document.getElementById('qr-content').value.trim();
            if (phone) {
                qrData = `tel:${phone}`;
            }
            break;
    }

    return qrData;
}

// Generate QR code with options
function generateQRCode(data, options = {}, isPremium = false) {
    try {
        const qrOptions = {
            size: 300,
            background: '#ffffff',
            foreground: '#000000',
            padding: 10,
            level: 'M',
            ...options
        };

        const canvas = document.createElement('canvas');
        const qr = new QRious({
            element: canvas,
            value: data,
            ...qrOptions
        });

        // Display the QR code
        const display = document.getElementById('qr-code-display');
        display.innerHTML = '';
        display.appendChild(canvas);

        // Store current QR data for download
        currentQRCode = canvas;

        // Show download section
        document.getElementById('download-section').style.display = 'block';

        // Update current QR data
        currentQRData = {
            canvas: canvas,
            content: data,
            options: qrOptions,
            isPremium: isPremium
        };

        return true;
    } catch (error) {
        console.error('QR generation error:', error);
        alert('Chyba pri vytváraní QR kódu. Skúste znovu.');
        return false;
    }
}

// Download QR code
async function downloadQR() {
    if (!currentQRCode) {
        alert('Najprv vygeneruj QR kód!');
        return;
    }

    if (currentQRCode.isPremium && remainingCredits > 0) {
        // Deduct credit on download
        remainingCredits--;
        updateCreditsDisplay();

        // Update localStorage
        if (currentSessionId) {
            const storedSession = localStorage.getItem('premiumSession');
            if (storedSession) {
                const session = JSON.parse(storedSession);
                session.credits = remainingCredits;
                localStorage.setItem('premiumSession', JSON.stringify(session));
            }
        }

        // Send credit deduction to server
        try {
            await fetch('/api/deduct-credit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    email: currentUserEmail
                })
            });
        } catch (error) {
            console.warn('Failed to sync credit deduction with server:', error);
        }
    }

    // Download the file
    try {
        const link = document.createElement('a');
        link.download = currentQRCode.isPremium ? 'premium-qr-code.png' : 'qr-code.png';
        link.href = currentQRCode.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error('Download error:', error);
        alert('Chyba pri sťahovaní súboru');
    }
}

// Download SVG version
async function downloadQRSVG() {
    if (!currentQRCode) {
        alert('Najprv vygeneruj QR kód!');
        return;
    }

    if (currentQRCode.isPremium && remainingCredits > 0) {
        // Deduct credit on download
        remainingCredits--;
        updateCreditsDisplay();

        // Update localStorage
        if (currentSessionId) {
            const storedSession = localStorage.getItem('premiumSession');
            if (storedSession) {
                const session = JSON.parse(storedSession);
                session.credits = remainingCredits;
                localStorage.setItem('premiumSession', JSON.stringify(session));
            }
        }

        // Send credit deduction to server
        try {
            await fetch('/api/deduct-credit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    email: currentUserEmail
                })
            });
        } catch (error) {
            console.warn('Failed to sync credit deduction with server:', error);
        }
    }

    // SVG is only available for premium
    if (!currentQRCode.isPremium) {
        alert('SVG download je dostupný len pre premium QR kódy');
        return;
    }

    // Create simple SVG download
    try {
        const dataURL = currentQRCode.toDataURL('image/png');
        const size = currentQRData.settings?.qrSize || 300;

        const svg = `
            <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="${currentQRData.settings?.backgroundColor || '#ffffff'}"/>
                <image width="100%" height="100%" href="${dataURL}"/>
            </svg>
        `;

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'premium-qr-code.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('SVG download error:', error);
        alert('SVG download nie je momentálne dostupný');
    }
}

// Template selection
function selectTemplate(templateName) {
    selectedTemplate = templateName;

    // Remove active class from all templates
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.remove('active');
    });

    // Add active class to selected template
    event.target.closest('.template-card').classList.add('active');

    // Apply template colors to color inputs
    const templates = getTemplateConfigs();
    if (templates[templateName]) {
        const config = templates[templateName];
        document.getElementById('qr-foreground').value = config.foreground;
        document.getElementById('qr-background').value = config.background;
    }
}

function getTemplateConfigs() {
    return {
        business: {
            foreground: '#2c3e50',
            background: '#ecf0f1'
        },
        creative: {
            foreground: '#e74c3c',
            background: '#fff5f5'
        },
        minimal: {
            foreground: '#34495e',
            background: '#ffffff'
        },
        gradient: {
            foreground: '#8e44ad',
            background: '#f8f9fa'
        }
    };
}

function applyTemplate(templateName, options) {
    const templates = getTemplateConfigs();
    if (templates[templateName]) {
        return { ...options, ...templates[templateName] };
    }
    return options;
}

// Update input fields based on QR type
function updateInputFields() {
    const qrType = document.getElementById('qr-type').value;

    // Hide all input groups
    document.getElementById('text-input').style.display = 'none';
    document.getElementById('url-input').style.display = 'none';
    document.getElementById('wifi-input').style.display = 'none';

    // Show relevant input group
    switch (qrType) {
        case 'text':
            document.getElementById('text-input').style.display = 'block';
            document.getElementById('qr-content').placeholder = 'Zadaj text...';
            break;
        case 'url':
            document.getElementById('url-input').style.display = 'block';
            break;
        case 'wifi':
            document.getElementById('wifi-input').style.display = 'block';
            break;
        case 'email':
            document.getElementById('text-input').style.display = 'block';
            document.getElementById('qr-content').placeholder = 'zadaj@email.com';
            break;
        case 'phone':
            document.getElementById('text-input').style.display = 'block';
            document.getElementById('qr-content').placeholder = '+421901234567';
            break;
    }
}

// Initialize size slider
function initializeSizeSlider() {
    const sizeSlider = document.getElementById('qr-size');
    const sizeDisplay = document.getElementById('size-display');

    if (sizeSlider && sizeDisplay) {
        sizeSlider.addEventListener('input', function () {
            sizeDisplay.textContent = this.value + 'px';
        });
    }
}

// Smooth scrolling functionality
function addSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function scrollToGenerator() {
    document.getElementById('generator').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Info modal functions (keeping existing)
function showExamples() {
    const examplesModal = createInfoModal('Ukážky QR kódov', `
        <div class="examples-grid">
            <div class="example-item">
                <h4>🌐 Webstránka</h4>
                <p>QR kód pre rýchly prístup na webstránku</p>
                <div class="example-qr">📱</div>
            </div>
            <div class="example-item">
                <h4>📧 Email</h4>
                <p>Automatické otvorenie emailovej aplikácie</p>
                <div class="example-qr">📱</div>
            </div>
            <div class="example-item">
                <h4>📶 WiFi</h4>
                <p>Automatické pripojenie k WiFi sieti</p>
                <div class="example-qr">📱</div>
            </div>
            <div class="example-item">
                <h4>📞 Telefón</h4>
                <p>Priame volanie na telefónne číslo</p>
                <div class="example-qr">📱</div>
            </div>
        </div>
        <p><strong>💡 Tip:</strong> Premium verzia ponúka krásne dizajny s vlastnými farbami a logami!</p>
    `);
    document.body.appendChild(examplesModal);
    setTimeout(() => examplesModal.classList.add('show'), 100);
}

function showContact() {
    const contactModal = createInfoModal('Kontakt', `
        <div class="contact-info">
            <h4>📧 Email</h4>
            <p><a href="mailto:info@beautifulqr.sk">info@beautifulqr.sk</a></p>
            
            <h4>💳 Premium QR kódy</h4>
            <p>Okamžitá aktivácia po PayPal platbe. Backup link na email.</p>
            
            <h4>🕒 Podpora</h4>
            <p>Odpovedáme do 24 hodín. Premium funkcie sú aktivované okamžite.</p>
            
            <h4>🇸🇰 Slovensko</h4>
            <p>Služba vytvorená na Slovensku pre slovenských používateľov.</p>
        </div>
    `);
    document.body.appendChild(contactModal);
    setTimeout(() => contactModal.classList.add('show'), 100);
}

function showTerms() {
    const termsModal = createInfoModal('Obchodné podmienky', `
        <div class="terms-content">
            <h4>1. Služby</h4>
            <p><strong>Bezplatné:</strong> Neobmedzené základné QR kódy (čierne)</p>
            <p><strong>Premium:</strong> Farebné QR kódy s vlastnými dizajnmi</p>
            
            <h4>2. Platby</h4>
            <p>Premium balíky sa platia jednorazovo cez PayPal.</p>
            <p>Aktivácia okamžite po úspešnej platbe.</p>
            
            <h4>3. Používanie</h4>
            <p>Premium credits sa odpočítavajú pri stiahnutí QR kódu.</p>
            <p>Session trvá 24 hodín od aktivácie.</p>
            
            <h4>4. Podpora</h4>
            <p>Pre otázky kontaktujte info@beautifulqr.sk</p>
        </div>
    `);
    document.body.appendChild(termsModal);
    setTimeout(() => termsModal.classList.add('show'), 100);
}

function showPrivacy() {
    const privacyModal = createInfoModal('Ochrana osobných údajov', `
        <div class="privacy-content">
            <h4>1. Aké údaje zbierame</h4>
            <p><strong>Email:</strong> Len pri kúpe premium balíkov (pre doručenie prístupu)</p>
            <p><strong>QR obsah:</strong> Spracováva sa lokálne, neuchováva sa</p>
            
            <h4>2. Používanie údajov</h4>
            <p>Email používame len na doručenie premium prístupu.</p>
            <p>QR kódy sa generujú v prehliadači, neposielajú na server.</p>
            
            <h4>3. Doba uchovávania</h4>
            <p>Email: 1 rok (pre support)</p>
            <p>QR obsah: Neuchováva sa</p>
            
            <h4>4. Vaše práva</h4>
            <p>Máte právo na vymazanie údajov. Kontakt: info@beautifulqr.sk</p>
        </div>
    `);
    document.body.appendChild(privacyModal);
    setTimeout(() => privacyModal.classList.add('show'), 100);
}

function createInfoModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'info-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeInfoModal(this)"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="close-btn" onclick="closeInfoModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeInfoModal(this)">Zavrieť</button>
            </div>
        </div>
    `;
    return modal;
}

function closeInfoModal(element) {
    const modal = element.closest('.info-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// Add modal styles
function addModalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .purchase-modal, .info-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .purchase-modal.show, .info-modal.show {
            opacity: 1;
            visibility: visible;
        }
        
        .modal-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 15px;
            padding: 0;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2rem 2rem 1rem 2rem;
            border-bottom: 1px solid #eee;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #333;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-body {
            padding: 2rem;
        }
        
        .modal-footer {
            padding: 1rem 2rem 2rem 2rem;
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        
        .purchase-summary {
            text-align: center;
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            border-radius: 12px;
            color: white;
        }
        
        .final-price {
            font-size: 2.5rem;
            font-weight: 700;
            display: block;
        }
        
        .original-price {
            text-decoration: line-through;
            opacity: 0.7;
            font-size: 1rem;
            margin-left: 10px;
        }
        
        .savings {
            margin: 1rem 0 0 0;
            font-weight: 600;
        }
        
        .email-section {
            margin-bottom: 2rem;
        }
        
        .email-section label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #333;
        }
        
        .email-section input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 1rem;
            margin-bottom: 0.5rem;
        }
        
        .email-section input:focus {
            outline: none;
            border-color: #f093fb;
        }
        
        .email-note {
            font-size: 0.9rem;
            color: #666;
            margin: 0;
        }
        
        .payment-methods {
            margin-top: 2rem;
        }
        
        .examples-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin: 1.5rem 0;
        }
        
        .example-item {
            text-align: center;
            padding: 1.5rem;
            border: 2px solid #f0f0f0;
            border-radius: 12px;
            transition: all 0.3s ease;
        }
        
        .example-item:hover {
            border-color: #f093fb;
            transform: translateY(-2px);
        }
        
        .contact-info h4, .terms-content h4, .privacy-content h4 {
            color: #333;
            margin: 1.5rem 0 0.5rem 0;
            font-size: 1.1rem;
        }
        
        .contact-info h4:first-child, .terms-content h4:first-child, .privacy-content h4:first-child {
            margin-top: 0;
        }
        
        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
                margin: 1rem;
                max-height: 90vh;
            }
            
            .examples-grid {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(style);
}

// Initialize modal styles on load
addModalStyles();
addModalStyles(); 