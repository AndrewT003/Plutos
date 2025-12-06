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

if (!apiId || !apiHash || !targetUser) {
    console.error("❌ Помилка: API_ID, API_HASH або TARGET_USER відсутні у .env");
    process.exit(1);
}

const session = new StringSession(process.env.SESSION || "");
const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
});

(async () => {
    console.log("🔄 Підключення Telegram клієнта...");

    if (!process.env.SESSION || process.env.SESSION.length < 10) {
        console.log("📱 Перше авторизування Telegram:");

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

    console.log("✅ Telegram клієнт готовий!");
})();


// ===========================
// 📌 ФУНКЦІЯ ВІДПРАВКИ ПОВІДОМЛЕНЬ
// ===========================
async function sendTelegramMessage(messageText) {
    try {
        await client.sendMessage(targetUser, { message: messageText });
        console.log("📨 Повідомлення надіслано →", targetUser);
    } catch (err) {
        console.error("❌ Помилка при надсиланні:", err.message);
    }
}


// ===========================
// 📌 EXPRESS НАЛАШТУВАННЯ
// ===========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
    const { telegram_nick, from_currency, amount, amount_currency, mode } = req.body;

    if (!telegram_nick || !from_currency || !amount) {
        return res.json({ error: "Пожалуйста заполните все поля" });
    }

    if (!exchangeRates[from_currency]) {
        return res.json({ error: "Неверная валюта" });
    }

    const operationType = mode === "sell" ? "💰 Продаю" : "💵 Покупаю";
    const operationText = mode === "sell" ? "продажу" : "покупку";

    const message = `
    📱 Нова заявка на ${operationText}

    👤 Телеграм: @${telegram_nick}
    ${operationType} ${from_currency}
    💵 Сума: ${amount} ${amount_currency || 'USD'}
    `;


    await sendTelegramMessage(message);

    res.json({
        success: true,
        message: "Заявка успішно відправлена! Ми скоро звʼяжемося з вами.",
    });
});


// ===========================
// 📌 СТОРІНКИ + СТАТИКА
// ===========================
app.get("/", (req, res) => res.render("index", { title: "Collect & Exchange" }));
app.use(express.static(path.join(__dirname, "public")));


// ===========================
// 📌 START SERVER
// ===========================
app.listen(PORT, () =>
    console.log(`🚀 Server running: http://localhost:${PORT}`)
);
