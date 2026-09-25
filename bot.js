/**
 * CreatorsTechBot — бот на Node.js (Telegraf), без Python.
 * Обязательная подписка на канал перед доступом — проверяется по-настоящему,
 * через Telegram Bot API (getChatMember), а не на доверии.
 *
 * ВАЖНО перед запуском:
 * 1. Токен уже вписан ниже (BOT_TOKEN). Никому не показывайте этот файл и не
 *    выкладывайте его в публичные места (GitHub и т.п.) — с этим токеном можно
 *    полностью управлять вашим ботом.
 * 2. Добавьте бота АДМИНИСТРАТОРОМ канала @darknexeditz — без этого Telegram
 *    не даст боту проверять, кто подписан, а кто нет.
 * 3. Установите Node.js (если ещё нет): https://nodejs.org
 * 4. Установите зависимости:  npm install
 * 5. Запустите:  node bot.js
 */

const { Telegraf, Markup } = require('telegraf');

// ==== настройки ====
const BOT_TOKEN = process.env.BOT_TOKEN || '8920314833:AAHfYRxvLHOwwqlt7PK2_XHe61lvdo3oHtw';
const CHANNEL_USERNAME = '@darknexeditz';
const CHANNEL_LINK = 'https://t.me/darknexeditz';

const WELCOME_TEXT =
  'Добро пожаловать! 🎉\n\n' +
  'Спасибо за подписку — теперь у вас есть полный доступ.\n' +
  'Напишите /help, если нужна помощь.';
const NOT_SUBSCRIBED_TEXT = 'Чтобы пользоваться ботом, подпишитесь на наш канал 👇';
const STILL_NOT_SUBSCRIBED_TEXT = 'Вы ещё не подписаны. Подпишитесь и нажмите проверку ещё раз.';

const bot = new Telegraf(BOT_TOKEN);

function gateKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url('📢 Подписаться на канал', CHANNEL_LINK)],
    [Markup.button.callback('✅ Я подписался — проверить', 'check_sub')],
  ]);
}

// Реальная проверка подписки через Telegram Bot API
async function isSubscribed(userId) {
  try {
    const member = await bot.telegram.getChatMember(CHANNEL_USERNAME, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (e) {
    // Частая причина ошибки здесь — бот не добавлен админом в канал.
    console.warn('Не удалось проверить подписку:', e.message);
    return false;
  }
}

bot.start(async (ctx) => {
  if (await isSubscribed(ctx.from.id)) {
    await ctx.reply(WELCOME_TEXT);
  } else {
    await ctx.reply(NOT_SUBSCRIBED_TEXT, gateKeyboard());
  }
});

bot.action('check_sub', async (ctx) => {
  if (await isSubscribed(ctx.from.id)) {
    await ctx.editMessageText(WELCOME_TEXT);
    await ctx.answerCbQuery('Подписка подтверждена ✅');
  } else {
    await ctx.answerCbQuery(STILL_NOT_SUBSCRIBED_TEXT, { show_alert: true });
  }
});

bot.help(async (ctx) => {
  if (await isSubscribed(ctx.from.id)) {
    await ctx.reply('Чем могу помочь? (тут можно дописать своё меню/логику)');
  } else {
    await ctx.reply(NOT_SUBSCRIBED_TEXT, gateKeyboard());
  }
});

// Любое другое сообщение — тоже проверяем подписку перед ответом
bot.on('text', async (ctx) => {
  if (await isSubscribed(ctx.from.id)) {
    await ctx.reply('Получил ваше сообщение! (сюда можно добавить свою логику ответов)');
  } else {
    await ctx.reply(NOT_SUBSCRIBED_TEXT, gateKeyboard());
  }
});

bot.launch();
console.log('Бот запущен и слушает сообщения (Ctrl+C, чтобы остановить).');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
