console.log("exchange.js loaded");

// DOM elements (будуть ініціалізовані після DOMContentLoaded)
// Перевіряємо чи змінні вже задекларовані
if (typeof exchangeForm === 'undefined') {
  var exchangeForm;
  var telegramNick;
  var fromCurrency;
  var amount;
  var amountCurrency;
  var resultBox;
  var resultMessage;
  var errorBox;
  var errorMessage;
  var errorClose;
  var previewCurrency;
  var previewPrice;
  var buyBtn;
  var sellBtn;
  var exchangeFormWrapper;
  var currencyLabel;
  var calculationLabel;
}

// Rates
let cryptoRates = {};
let fiatRates = {};

// Current exchange mode
let currentMode = 'buy';

// Ініціалізація DOM елементів
function initDOMElements() {
  exchangeForm = document.getElementById('exchangeForm');
  telegramNick = document.getElementById('telegram_nick');
  fromCurrency = document.getElementById('from_currency');
  amount = document.getElementById('amount');
  amountCurrency = document.getElementById('amount_currency');
  resultBox = document.getElementById('resultBox');
  resultMessage = document.getElementById('resultMessage');
  errorBox = document.getElementById('errorBox');
  errorMessage = document.getElementById('errorMessage');
  errorClose = document.querySelector('.error-close');
  previewCurrency = document.getElementById('previewFromCurrency');
  previewPrice = document.getElementById('previewToAmount');
  buyBtn = document.getElementById('buyBtn');
  sellBtn = document.getElementById('sellBtn');
  exchangeFormWrapper = document.querySelector('.exchange-form-wrapper');
  currencyLabel = document.getElementById('currencyLabel');
  calculationLabel = document.getElementById('calculationLabel');
}

// Fetch rates
async function fetchRatesFromAPI() {
  try {
    const res = await fetch('/api/rates');

    if (!res.ok) throw new Error("API returned HTML or error");

    const data = await res.json();
    cryptoRates = data.crypto;
    fiatRates = data.fiat;

    console.log("✔ Crypto rates loaded:", cryptoRates);
    console.log("✔ Fiat rates loaded:", fiatRates);

    updateCurrencyPrice();
    updateCalculation();
  } catch (err) {
    console.error("API error:", err);
  }
}

function updateCurrencyPrice() {
  if (!previewCurrency || !previewPrice) return;

  const currency = previewCurrency.value;

  previewPrice.textContent = cryptoRates[currency]
    ? cryptoRates[currency].toLocaleString("en-US", {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      })
    : "0.00";
}

// Розрахунок та відображення скільки криптовалюти отримаєш
function updateCalculation() {
  if (!fromCurrency || !amount || !amountCurrency || !calculationLabel) return;

  const crypto = fromCurrency.value;
  const amountValue = parseFloat(amount.value);
  const fiatCurrency = amountCurrency.value;

  // Якщо поля не заповнені, ховаємо label
  if (!crypto || !amountValue || amountValue <= 0) {
    calculationLabel.classList.remove('show');
    return;
  }

  const cryptoPrice = cryptoRates[crypto];
  const fiatRate = fiatRates[fiatCurrency];

  if (!cryptoPrice || !fiatRate) {
    calculationLabel.classList.remove('show');
    return;
  }

  // Конвертуємо фіатну валюту в USD
  const amountInUSD = amountValue / fiatRate;

  // Розраховуємо кількість криптовалюти
  const cryptoAmount = amountInUSD / cryptoPrice;

  // Формуємо текст в залежності від режиму
  let text = '';
  if (currentMode === 'buy') {
    text = `Купишь ${cryptoAmount.toFixed(2)} ${crypto}`;
  } else {
    text = `Продашь ${cryptoAmount.toFixed(2)} ${crypto}`;
  }

  calculationLabel.textContent = text;
  calculationLabel.classList.add('show');
}

// Функції для обробки помилок
function clearErrors() {
  document.getElementById('telegram_nick_error').textContent = '';
  document.getElementById('from_currency_error').textContent = '';
  document.getElementById('amount_error').textContent = '';

  telegramNick.classList.remove('error');
  fromCurrency.classList.remove('error');
  amount.classList.remove('error');

  // Remove has-error from all form groups
  document.querySelectorAll('.form-group').forEach(group => {
    group.classList.remove('has-error');
  });

  errorBox.classList.remove('show');
}

function showError(fieldId, errorText) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(fieldId + '_error');

  field.classList.add('error');
  errorElement.textContent = errorText;
  field.parentElement.classList.add('has-error');
}

function showErrorBox(message) {
  errorMessage.textContent = message;
  errorBox.classList.add('show');

  // Скролимо до помилки
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// EXCHANGE MODE SWITCHING (BUY/SELL)
// ============================================

function switchMode(mode) {
  if (currentMode === mode) return; // Already in this mode

  // Trigger flip animation
  exchangeFormWrapper.classList.add('flip');

  // Remove animation class after it completes
  setTimeout(() => {
    exchangeFormWrapper.classList.remove('flip');
  }, 600);

  // Update current mode
  currentMode = mode;

  // Update button states and label
  if (mode === 'buy') {
    buyBtn.classList.add('active');
    sellBtn.classList.remove('active');
    exchangeForm.classList.remove('sell-mode');
    if (currencyLabel) {
      currencyLabel.textContent = 'Покупаю:';
    }
  } else {
    sellBtn.classList.add('active');
    buyBtn.classList.remove('active');
    exchangeForm.classList.add('sell-mode');
    if (currencyLabel) {
      currencyLabel.textContent = 'Продаю:';
    }
  }

  // Clear form data
  clearErrors();
  exchangeForm.reset();
  resultBox.classList.remove('show');

  // Update calculation with new mode
  updateCalculation();
}

// Функція для приєднання слухачів
function attachEventListeners() {
  // Buy/Sell mode buttons
  if (buyBtn) {
    buyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchMode('buy');
    });
  }

  if (sellBtn) {
    sellBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchMode('sell');
    });
  }

  // Закриття помилки при натисненні на X
  if (errorClose) {
    errorClose.addEventListener('click', () => {
      errorBox.classList.remove('show');
    });
  }

  // Закриття повідомлення про успіх при натисненні на X
  const resultClose = document.getElementById('resultClose');
  if (resultClose) {
    resultClose.addEventListener('click', () => {
      resultBox.classList.remove('show');
    });
  }

  // Очищення помилок при введенні в поле
  if (telegramNick) {
    telegramNick.addEventListener('input', () => {
      if (telegramNick.classList.contains('error')) {
        clearErrors();
      }
    });
  }

  if (fromCurrency) {
    fromCurrency.addEventListener('change', () => {
      if (fromCurrency.classList.contains('error')) {
        clearErrors();
      }
      updateCalculation();
    });
  }

  if (amount) {
    amount.addEventListener('input', () => {
      if (amount.classList.contains('error')) {
        clearErrors();
      }
      updateCalculation();
    });
  }

  if (amountCurrency) {
    amountCurrency.addEventListener('change', () => {
      updateCalculation();
    });
  }

  if (exchangeForm) {
    exchangeForm.addEventListener('submit', handleFormSubmit);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  // Очищаємо помилки з попередньої спроби
  clearErrors();

  const nick = telegramNick.value.trim();
  const currency = fromCurrency.value;
  const amountValue = parseFloat(amount.value);
  const fiatCurrency = amountCurrency.value;

  let hasErrors = false;

  // Валидация ника
  if (!nick) {
    showError('telegram_nick', 'Введите ваш ник в Telegram');
    hasErrors = true;
  } else if (nick.length < 3) {
    showError('telegram_nick', 'Ник должен содержать минимум 3 символа');
    hasErrors = true;
  }

  // Валидация валюты
  if (!currency) {
    showError('from_currency', 'Выберите валюту для обмена');
    hasErrors = true;
  }

  // Валидация суммы
  if (!amount.value) {
    showError('amount', 'Введите сумму для обмена');
    hasErrors = true;
  } else if (isNaN(amountValue) || amountValue <= 0) {
    showError('amount', 'Сумма должна быть больше 0');
    hasErrors = true;
  }

  // Если есть ошибки, возвращаемся
  if (hasErrors) {
    return;
  }

  try {
    const res = await fetch('/exchange', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_nick: nick,
        from_currency: currency,
        amount: amountValue,
        amount_currency: fiatCurrency,
        mode: currentMode
      })
    });

    const data = await res.json();

    if (data.error) {
      console.error('Ошибка:', data.error);
      return;
    }

    // Очищаем ошибки при успехе
    clearErrors();

    // Показываем сообщение успеха
    resultMessage.textContent = data.message || 'Ваша заявка успешно отправлена!';
    resultBox.classList.add("show");

    // Очищаем форму
    exchangeForm.reset();

    // Скрываем сообщение через 5 секунд
    setTimeout(() => resultBox.classList.remove("show"), 5000);
  } catch (err) {
    console.error("Ошибка отправки:", err);
  }
}

// ============================================
// CUSTOM DROPDOWN FUNCTIONALITY
// ============================================

function initCustomDropdown() {
  const dropdownToggle = document.getElementById('dropdownToggle');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const dropdownItems = document.querySelectorAll('.dropdown-item');
  const customDropdown = document.querySelector('.custom-dropdown');
  const previewFromCurrency = document.getElementById('previewFromCurrency');

  if (!dropdownToggle || !dropdownMenu) return;

  // Toggle dropdown menu
  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    customDropdown.classList.toggle('open');
  });

  // Handle item selection
  dropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();

      const value = item.getAttribute('data-value');
      const text = item.textContent;

      // Update hidden input
      previewFromCurrency.value = value;

      // Update display text
      const dropdownValue = document.querySelector('.dropdown-value');
      dropdownValue.textContent = text;

      // Update active state
      dropdownItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Close dropdown
      customDropdown.classList.remove('open');

      // Trigger change event for preview price update
      previewFromCurrency.dispatchEvent(new Event('change'));
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!customDropdown.contains(e.target)) {
      customDropdown.classList.remove('open');
    }
  });

  // Set initial active item
  dropdownItems.forEach(item => {
    if (item.getAttribute('data-value') === 'BTC') {
      item.classList.add('active');
    }
  });
}

// ============================================
// BURGER MENU FUNCTIONALITY (MOBILE)
// ============================================

function initBurgerMenu() {
  const burgerBtn = document.getElementById('burgerBtn');
  const navMenu = document.getElementById('navMenu');
  const navLinks = navMenu.querySelectorAll('a');

  if (!burgerBtn || !navMenu) return;

  // Toggle menu
  burgerBtn.addEventListener('click', () => {
    burgerBtn.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close menu when clicking on a link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      burgerBtn.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('header')) {
      burgerBtn.classList.remove('active');
      navMenu.classList.remove('active');
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  // Ініціалізуємо DOM елементи
  initDOMElements();

  // Приєднуємо слухачі подій
  attachEventListeners();

  // Ініціалізуємо кастомний dropdown
  initCustomDropdown();

  // Ініціалізуємо бургер-меню
  initBurgerMenu();

  // Завантажуємо курси валют
  await fetchRatesFromAPI();

  // Priview слухач
  if (previewCurrency) {
    previewCurrency.addEventListener('change', updateCurrencyPrice);
  }
});
