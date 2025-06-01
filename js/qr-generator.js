// QR Code Generator functionality
let currentQRCode = null;
let currentQRData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    // Add smooth scrolling
    addSmoothScrolling();

    // Initialize QR generator
    updateInputFields();
});

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

// Scroll to generator section
function scrollToGenerator() {
    document.getElementById('generator').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Show examples (placeholder for now)
function showExamples() {
    alert('Ukážky budú pridané v ďalšej verzii! 🎨');
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

// Generate basic QR code
function generateBasicQR() {
    const qrType = document.getElementById('qr-type').value;
    let qrData = '';

    // Get data based on type
    switch (qrType) {
        case 'text':
            qrData = document.getElementById('qr-content').value.trim();
            break;
        case 'url':
            qrData = document.getElementById('url-content').value.trim();
            // Add https:// if not present
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
                return;
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

    if (!qrData) {
        alert('Prosím zadaj obsah pre QR kód');
        return;
    }

    // Store current data for potential premium upgrade
    currentQRData = {
        type: qrType,
        data: qrData
    };

    // Generate QR code
    generateQRCode(qrData);
}

// Generate QR code using qrcode.js library
function generateQRCode(data, options = {}) {
    const qrDisplay = document.getElementById('qr-code-display');

    // Clear previous QR code
    qrDisplay.innerHTML = '';

    // Show loading state
    qrDisplay.innerHTML = '<div class="loading-spinner">Generujem QR kód...</div>';

    // Default options for basic QR code
    const defaultOptions = {
        width: 300,
        height: 300,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        ...options
    };

    // Generate QR code
    QRCode.toCanvas(data, defaultOptions, function (error, canvas) {
        if (error) {
            console.error('QR Code generation error:', error);
            qrDisplay.innerHTML = '<div class="error">Chyba pri generovaní QR kódu</div>';
            return;
        }

        // Clear loading and show QR code
        qrDisplay.innerHTML = '';
        qrDisplay.appendChild(canvas);

        // Store current QR code
        currentQRCode = canvas;

        // Show download section
        document.getElementById('download-section').style.display = 'block';

        // Add success animation
        canvas.style.opacity = '0';
        canvas.style.transform = 'scale(0.8)';
        setTimeout(() => {
            canvas.style.transition = 'all 0.3s ease';
            canvas.style.opacity = '1';
            canvas.style.transform = 'scale(1)';
        }, 100);
    });
}

// Download QR code as PNG
function downloadQR() {
    if (!currentQRCode) {
        alert('Najprv vygeneruj QR kód');
        return;
    }

    // Create download link
    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = currentQRCode.toDataURL();

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download QR code as SVG (premium feature placeholder)
function downloadQRSVG() {
    alert('SVG download je dostupný v Premium verzii za 1€! 🎨');
    showPremiumOptions();
}

// Show premium options
function showPremiumOptions() {
    if (!currentQRData) {
        alert('Najprv vygeneruj základný QR kód');
        return;
    }

    // Create premium modal/popup
    const premiumModal = createPremiumModal();
    document.body.appendChild(premiumModal);

    // Show modal
    setTimeout(() => {
        premiumModal.classList.add('show');
    }, 100);
}

// Create premium options modal
function createPremiumModal() {
    const modal = document.createElement('div');
    modal.className = 'premium-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closePremiumModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>🎨 Premium QR Design</h3>
                <button class="close-btn" onclick="closePremiumModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p>Vylepši svoj QR kód s prémiové funkcie:</p>
                <div class="premium-features">
                    <div class="feature">✅ Vlastné farby</div>
                    <div class="feature">✅ Logo v strede</div>
                    <div class="feature">✅ Rôzne štýly</div>
                    <div class="feature">✅ Vysoké rozlíšenie</div>
                    <div class="feature">✅ SVG formát</div>
                </div>
                <div class="price-display">
                    <span class="price">1€</span>
                    <span class="price-note">jednorazový poplatok</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-premium btn-large" onclick="initiatePayment()">
                    Pokračovať na platbu 💳
                </button>
                <button class="btn-secondary" onclick="closePremiumModal()">
                    Zrušiť
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Close premium modal
function closePremiumModal() {
    const modal = document.querySelector('.premium-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Initiate payment (placeholder)
function initiatePayment() {
    alert('Platobný systém bude pridaný v ďalšej verzii! PayPal/Stripe integrácia už čoskoro. 💳');
    closePremiumModal();
}

// Add modal styles to head
function addModalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .premium-modal {
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
        
        .premium-modal.show {
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
            max-width: 500px;
            width: 90%;
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
        
        .close-btn:hover {
            color: #333;
        }
        
        .modal-body {
            padding: 2rem;
        }
        
        .premium-features {
            display: grid;
            gap: 0.5rem;
            margin: 1.5rem 0;
        }
        
        .feature {
            padding: 0.5rem 0;
            color: #555;
        }
        
        .price-display {
            text-align: center;
            margin: 2rem 0;
            padding: 1.5rem;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            border-radius: 12px;
            color: white;
        }
        
        .price {
            font-size: 2.5rem;
            font-weight: 700;
            display: block;
        }
        
        .price-note {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .modal-footer {
            padding: 1rem 2rem 2rem 2rem;
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        
        .loading-spinner {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: #666;
            font-size: 1.1rem;
        }
        
        .error {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: #e74c3c;
            font-size: 1.1rem;
        }
        
        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
                margin: 1rem;
            }
            
            .modal-footer {
                flex-direction: column;
            }
            
            .modal-footer button {
                width: 100%;
            }
        }
    `;

    document.head.appendChild(style);
}

// Initialize modal styles
addModalStyles(); 