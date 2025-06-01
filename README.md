# Beautiful QR Codes - TrustPay Integration

Kompletný QR kód generátor s TrustPay platobnou bránou pre slovenský trh.

## 🚀 Funkcie

- **Základné QR kódy zadarmo** - neobmedzene
- **Premium QR kódy** - vlastné farby, šablóny, SVG export
- **TrustPay integrácia** - bezpečné platby kartou
- **Email notifikácie** - automatické zasielanie prístupových linkov
- **24-hodinové sessions** - flexibilný prístup k zakúpeným kreditom
- **Databázové sledovanie** - kompletné záznamy o platbách

## 🛠️ Technológie

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Platby**: TrustPay API
- **Email**: NodeMailer
- **Databáza**: JSON súbory (jednoduché, ale funkčné)

## 📋 Pred inštaláciou

### 1. TrustPay účet
1. Zaregistrujte sa na [TrustPay.eu](https://trustpay.eu)
2. Získajte **Merchant ID** a **Secret Key**
3. Nastavte Return URL na: `https://yourdomain.com/success`
4. Nastavte Error URL na: `https://yourdomain.com/error`

### 2. Email služba
Pre Gmail:
1. Zapnite 2FA na vašom Gmail účte
2. Vytvorte App Password: [Návod](https://support.google.com/accounts/answer/185833)
3. Použite tento App Password namiesto hlavného hesla

## 🔧 Inštalácia

### 1. Klonujte projekt
```bash
git clone <repository-url>
cd beautiful-qr-app
```

### 2. Nainštalujte závislosti
```bash
npm install
```

### 3. Konfigurácia
Skopírujte `config.example.env` do `.env` a vyplňte:

```env
# TrustPay Configuration
TRUSTPAY_MERCHANT_ID=your_actual_merchant_id
TRUSTPAY_SECRET_KEY=your_actual_secret_key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=Beautiful QR Codes <noreply@yourdomain.com>

# Application Configuration
BASE_URL=https://yourdomain.com
PORT=3000
NODE_ENV=production
```

### 4. Aktualizujte frontend konfiguraciu
V súbore `js/qr-generator.js` zmeňte:
```javascript
const merchantId = 'YOUR_TRUSTPAY_MERCHANT_ID'; // Line 172
```
Na váš skutočný Merchant ID.

## 🚀 Spustenie

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

Server bude dostupný na `http://localhost:3000`

## 🌐 Nasadenie

### Option 1: Heroku
1. Vytvorte Heroku app
2. Nastavte environment variables v Heroku dashboard
3. Deploy cez Git:
```bash
git push heroku main
```

### Option 2: VPS/Server
1. Nahrajte súbory na server
2. Nainštalujte Node.js a npm
3. Vytvorte `.env` súbor s konfiguráciou
4. Spustite s PM2:
```bash
npm install -g pm2
pm2 start server.js --name beautiful-qr
pm2 startup
pm2 save
```

### Option 3: Netlify/Vercel (Frontend only)
Pre statické nasadenie bez backendu:
1. Nasaďte len HTML/CSS/JS súbory
2. Použite externe API pre platby
3. Upravte fetch URLs na absolútne adresy

## 🔑 TrustPay nastavenie

### Return URLs
- **Success URL**: `https://yourdomain.com/success`
- **Error URL**: `https://yourdomain.com/error`
- **Notification URL**: `https://yourdomain.com/api/trustpay-webhook` (budúce rozšírenie)

### Podporované platby
- Visa, Mastercard
- Online banking (Slovensko)
- Google Pay, Apple Pay
- Všetky metódy dostupné cez TrustPay

## 📧 Email šablóny

Email sa automaticky pošle po úspešnej platbe s:
- Potvrdením objednávky
- Počtom zakúpených kreditov
- Prístupovým linkom
- Informáciami o platnosti (24 hodín)
- Záložným linkom pre obnovenie prístupu

## 💾 Databáza štruktúra

### Orders (objednávky)
```json
{
  "orderId": "QR202412xxxx",
  "sessionToken": "hex_token",
  "email": "user@example.com",
  "credits": 1,
  "amount": 1.00,
  "status": "completed",
  "paid": true,
  "createdAt": "2024-12-01T10:00:00Z",
  "completedAt": "2024-12-01T10:01:00Z"
}
```

### Sessions (relácie)
```json
{
  "sessionToken": "hex_token",
  "email": "user@example.com",
  "credits": 1,
  "orderId": "QR202412xxxx",
  "createdAt": "2024-12-01T10:01:00Z",
  "expiresAt": "2024-12-02T10:01:00Z",
  "lastUsed": "2024-12-01T10:05:00Z"
}
```

## 🔒 Bezpečnosť

- Session tokeny sú 32-byte hex strings
- 24-hodiná platnosť sessions
- Email validácia
- TrustPay podpis validácia (v produkcii)
- HTTPS povinné pre platby

## 📊 Monitoring

### API Endpoints
- `GET /api/health` - Health check
- `POST /api/create-order` - Vytvoriť objednávku
- `GET /success` - TrustPay success callback
- `GET /error` - TrustPay error callback
- `POST /api/deduct-credit` - Odpočítať kredit
- `GET /api/session/:id` - Informácie o session

### Logy
Server loguje:
- Vytvorené objednávky
- Úspešné platby
- Odoslané emaily
- Chyby a warnings

## 🐛 Troubleshooting

### Platby nefungujú
1. Skontrolujte Merchant ID v kóde
2. Overte Return URLs v TrustPay
3. Skontrolujte HTTPS certifikát

### Emaily sa neposielajú
1. Overte SMTP nastavenia
2. Skontrolujte App Password (Gmail)
3. Skontrolujte spam folder

### Session sa nestráva
1. Overte localStorage v prehliadači
2. Skontrolujte URL parametre
3. Overte databázu súbor

## 💰 Ceny a poplatky

### TrustPay poplatky (orientačne)
- Slovenské karty: ~1.5% + 0.15€
- Zahraničné karty: ~2.5% + 0.25€
- Online banking: ~0.5% + 0.10€

### Vaše zisky (pri 1€ QR kóde)
- Slovenská karta: ~0.80€
- Zahraničná karta: ~0.70€
- Online banking: ~0.85€

## 📝 TODO / Budúce rozšírenia

- [ ] Webhook validácia pre TrustPay
- [ ] PostgreSQL/MySQL databáza
- [ ] Admin dashboard
- [ ] Štatistiky a analytics
- [ ] Bulk operations
- [ ] API pre external integrácie
- [ ] Logo upload pre QR kódy
- [ ] Viac platobných metód

## 🆘 Podpora

Pre technickú podporu:
- Email: info@beautiful-qr.sk
- GitHub Issues: [Link to repository]

## 📄 Licencia

MIT License - môžete voľne používať a upravovať. 