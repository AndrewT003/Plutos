require("dotenv").config();
const express = require("express");
const path = require("path");
const https = require("https");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram");
const input = require("input");

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================
// 📌 TELEGRAM GRAMJS CLIENT
// ===========================
const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const targetUser = process.env.TARGET_USER; // @tima_003

let isMessagingEnabled = false;
let client = null;

if (!apiId || !apiHash || !targetUser) {
    console.warn("⚠️  Увага: API_ID, API_HASH або TARGET_USER відсутні у .env");
    console.warn("⚠️  Сайт працюватиме, але відправка повідомлень буде недоступна");
} else {
    const session = new StringSession(process.env.SESSION || "");
    client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
    });
}

(async () => {
    if (!client) {
        console.log("ℹ️  Telegram клієнт не налаштовано. Сервер запускається без функції повідомлень.");
        return;
    }

    try {
        console.log("🔄 Підключення Telegram клієнта...");

        if (!process.env.SESSION || process.env.SESSION.length < 10) {
            console.log("📱 Перше авторизування Telegram:");
            console.log("💡 Натисніть Ctrl+C щоб відхилити авторизацію і запустити сайт без повідомлень\n");

            await client.start({
                phoneNumber: async () => await input.text("Введи номер телефону: "),
                password: async () => await input.text("Пароль 2FA (якщо є): "),
                phoneCode: async () => await input.text("Код із Telegram: "),
                onError: (err) => console.log(err),
            });

            console.log("\n====================================");
            console.log("🔐 Збережи SESSION у .env:");
            console.log('SESSION="' + client.session.save() + '"');
            console.log("====================================\n");
        } else {
            await client.connect();
        }

        isMessagingEnabled = true;
        console.log("✅ Telegram клієнт готовий! Відправка повідомлень увімкнена.");
    } catch (err) {
        console.warn("⚠️  Помилка підключення Telegram:", err.message);
        console.warn("⚠️  Сервер запускається без функції відправки повідомлень.");
        isMessagingEnabled = false;
    }
})();


// ===========================
// 📌 ФУНКЦІЯ ВІДПРАВКИ ПОВІДОМЛЕНЬ
// ===========================
async function sendTelegramMessage(messageText) {
    if (!isMessagingEnabled || !client) {
        console.warn("⚠️  Відправка повідомлень недоступна (Telegram клієнт не підключено)");
        return false;
    }

    try {
        await client.sendMessage(targetUser, { message: messageText });
        console.log("📨 Повідомлення надіслано →", targetUser);
        return true;
    } catch (err) {
        console.error("❌ Помилка при надсиланні:", err.message);
        return false;
    }
}


// ===========================
// 📌 EXPRESS НАЛАШТУВАННЯ
// ===========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Логування всіх запитів
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
});

let exchangeRates = {
    BTC: 45000,
    ETH: 2500,
    USDT: 1,
    USDC: 1,
    BNB: 600,
    LTC: 150,
    TRX: 0.25,
};

let fiatRates = {
    USD: 1,
    EUR: 0.92,
    UAH: 41.5,
    RUB: 92,
};

// ===========================
// 📌 ОТРИМАННЯ КУРСІВ З COINGECKO
// ===========================
function fetchExchangeRates() {
    const url =
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin,binancecoin,litecoin,tron&vs_currencies=usd";

    https.get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => (data += chunk));

        res.on("end", () => {
            try {
                const prices = JSON.parse(data);

                exchangeRates = {
                    BTC: prices.bitcoin?.usd || exchangeRates.BTC,
                    ETH: prices.ethereum?.usd || exchangeRates.ETH,
                    USDT: prices.tether?.usd || exchangeRates.USDT,
                    USDC: prices["usd-coin"]?.usd || exchangeRates.USDC,
                    BNB: prices.binancecoin?.usd || exchangeRates.BNB,
                    LTC: prices.litecoin?.usd || exchangeRates.LTC,
                    TRX: prices.tron?.usd || exchangeRates.TRX,
                };

                console.log("✔ Курси оновлені:", exchangeRates);
            } catch (err) {
                console.error("Помилка парсингу:", err.message);
            }
        });
    }).on("error", (err) => {
        console.error("Помилка API:", err.message);
    });
}

// ===========================
// 📌 ОТРИМАННЯ КУРСІВ ФІАТНИХ ВАЛЮТ
// ===========================
function fetchFiatRates() {
    const url = "https://api.exchangerate-api.com/v4/latest/USD";

    https.get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => (data += chunk));

        res.on("end", () => {
            try {
                const response = JSON.parse(data);
                const rates = response.rates;

                fiatRates = {
                    USD: 1,
                    EUR: rates.EUR || fiatRates.EUR,
                    UAH: rates.UAH || fiatRates.UAH,
                    RUB: rates.RUB || fiatRates.RUB,
                };

                console.log("✔ Курси фіатних валют оновлені:", fiatRates);
            } catch (err) {
                console.error("Помилка парсингу фіатних курсів:", err.message);
            }
        });
    }).on("error", (err) => {
        console.error("Помилка API фіатних курсів:", err.message);
    });
}

fetchExchangeRates();
fetchFiatRates();
setInterval(fetchExchangeRates, 300000);
setInterval(fetchFiatRates, 300000);


// ===========================
// 📌 API ROUTES
// ===========================
app.get("/api/rates", (req, res) => {
    res.json({
        crypto: exchangeRates,
        fiat: fiatRates
    });
});

app.post("/exchange", async (req, res) => {
    try {
        const { telegram_nick, from_currency, amount, amount_currency, mode } = req.body;

        if (!telegram_nick || !from_currency || !amount) {
            return res.json({
                success: false,
                error: "Пожалуйста заполните все поля"
            });
        }

        if (!exchangeRates[from_currency]) {
            return res.json({
                success: false,
                error: "Неверная валюта"
            });
        }

        const operationType = mode === "sell" ? "💰 Продаю" : "💵 Покупаю";
        const operationText = mode === "sell" ? "продажу" : "покупку";

        const message = `
    📱 Нова заявка на ${operationText}

    👤 Телеграм: @${telegram_nick}
    ${operationType} ${from_currency}
    💵 Сума: ${amount} ${amount_currency || 'USD'}
    `;

        if (!isMessagingEnabled) {
            console.log("📋 Заявка отримана (повідомлення не відправлено):", message);
            return res.json({
                success: false,
                error: "Відправка повідомлень тимчасово недоступна. Спробуйте пізніше або зв'яжіться з нами напряму.",
            });
        }

        const sent = await sendTelegramMessage(message);

        if (sent) {
            res.json({
                success: true,
                message: "Заявка успішно відправлена! Ми скоро звʼяжемося з вами.",
            });
        } else {
            res.json({
                success: false,
                error: "Помилка відправки заявки. Будь ласка, спробуйте ще раз.",
            });
        }
    } catch (err) {
        console.error("❌ Помилка в /exchange endpoint:", err);
        res.status(500).json({
            success: false,
            error: "Внутрішня помилка сервера. Спробуйте пізніше.",
        });
    }
});


// ===========================
// 📌 СТОРІНКИ + СТАТИКА
// ===========================
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res, next) => {
    console.log("🏠 Обробка запиту на головну сторінку");
    console.log("🔍 Рендеримо: index.ejs");

    res.render("index", { title: "Collect & Exchange" }, (err, html) => {
        if (err) {
            console.error("❌ Помилка при рендерингу головної сторінки:");
            console.error("   Тип помилки:", err.name);
            console.error("   Повідомлення:", err.message);
            console.error("   Stack trace:", err.stack);

            // Повертаємо детальну помилку клієнту
            return res.status(500).send(`
                <h1>Internal Server Error</h1>
                <h2>${err.message}</h2>
                <pre>${err.stack}</pre>
            `);
        }
        console.log("✅ Сторінка успішно відрендерена");
        res.send(html);
    });
});

// ===========================
// 📌 ОБРОБКА ПОМИЛОК
// ===========================
app.use((err, req, res, next) => {
    console.error("❌ Глобальна помилка:");
    console.error("   URL:", req.url);
    console.error("   Method:", req.method);
    console.error("   Error:", err.message);
    console.error("   Stack:", err.stack);

    res.status(500).send(`
        <h1>Global Error Handler</h1>
        <h2>${err.message}</h2>
        <pre>${err.stack}</pre>
    `);
});


// ===========================
// 📌 START SERVER
// ===========================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🌐 Accessible at: http://localhost:${PORT}`);
    console.log(`📁 Views directory: ${path.join(__dirname, "views")}`);
    console.log(`📁 Public directory: ${path.join(__dirname, "public")}`);
    console.log(`✅ EJS view engine: ${app.get("view engine")}`);
});
