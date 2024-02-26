let { Bot,
    Keyboard,
    InlineKeyboard,
    GrammyError,
    HttpError,
    session } = require('grammy');

const GigaChat = require('gigachat-node').GigaChat;

const { getRandomQuestion, getCorrectAnswer } = require('./utils');
const { addUser, getUserById, updateUserById } = require('./api/user');

require('dotenv').config();

const GIGACHAT_CLIENT_SECRET_KEY = process.env.TOKEN;

const bot = new Bot(process.env.BOT_API_KEY);
const client = new GigaChat(
    clientSecretKey=GIGACHAT_CLIENT_SECRET_KEY,
    isIgnoreTSL=true,
    isPersonal=true,
    true,
    false,
);

client.createToken();

const initialData = { blockMessage: false,answerId:null };
bot.use(session({ initial: () => initialData }));


bot.command('start',async (ctx) => {
    const startKeyboard = new Keyboard()
        .text('Сети ЭВМ')
        .text('Схемотехника')
        .row()
        .text('Программирование')
        .text('Сетевые ОС')
        .row()
        .text('Случайный вопрос')
        .row()
        .text('Спросить вопрос у GigaChat')
        .resized();
   await ctx.reply('Привет! Я — Помощник Bot 🤖 \nЯ помогу тебе подготовиться к экзаменам ');
    await ctx.reply('Выбери тему вопроса в меню 🤔\nТакже я могу ответить на любой твой вопрос\nНажми кнопку "Спросить вопрос у GigaChat" и отправь свое сообщение в чат',{
        reply_markup:startKeyboard,
    });
});

bot.hears(
    ['Сети ЭВМ', 'Схемотехника', 'Программирование', 'Сетевые ОС', 'Случайный вопрос'],
    async (ctx) => {
        const topic = ctx.message.text.toLowerCase();
        const { question, questionTopic } = getRandomQuestion(topic);

        let inlineKeyboard;

        if (question.hasOptions) {
            const buttonRows = question.options.map((option) => [
                InlineKeyboard.text(
                    option.text,
                    JSON.stringify({
                        type: `${questionTopic}-option`,
                        isCorrect: option.isCorrect,
                        questionId: question.id,
                    }),
                ),
            ]);

            inlineKeyboard = InlineKeyboard.from(buttonRows);
        } else {
            inlineKeyboard = new InlineKeyboard().text(
                'Узнать ответ',
                JSON.stringify({
                    type: questionTopic,
                    questionId: question.id,
                }),
            );
        }

        await ctx.reply(question.text, {
            reply_markup: inlineKeyboard,
        });
    },
);

bot.callbackQuery("stop-dialog", async (ctx) => {
    const userId = ctx.from.id;
    try {
        await updateUserById(userId, { dialog: false });
        await ctx.reply('Диалог прекращен');
    }
    catch {
        await ctx.reply('Что-то пошло не так');
    }
    await ctx.answerCallbackQuery();
});


bot.on('callback_query:data', async (ctx) => {
    const session = await ctx.session;
    const callbackData = JSON.parse(ctx.callbackQuery.data);

    if ([callbackData.questionId].includes(session.answerId ) ) {
        await ctx.reply('Вы уже ответили на вопрос');
        await ctx.answerCallbackQuery();
        return;
    }

    if (!callbackData.type.includes('option')) {
        const answer = getCorrectAnswer(callbackData.type, callbackData.questionId);
        ctx.session.answerId = callbackData.questionId;

        await ctx.reply(answer, {
            parse_mode: 'HTML',
            disabled_web_page_preview: true,
        });
        await ctx.answerCallbackQuery();
        return;
    }

    if (callbackData.isCorrect) {
        await ctx.reply('Верно ✅');
        await ctx.answerCallbackQuery();
        return;
    }

    const answer = getCorrectAnswer(callbackData.type.split('-')[0], callbackData.questionId);

    ctx.session.answerId = callbackData.questionId;

    await ctx.reply(`Неверно ❌ Правильный ответ: ${answer} `);
    await ctx.answerCallbackQuery();
});

bot.hears('Спросить вопрос у GigaChat', async (ctx) => {
    const userId = ctx.from.id;

    try {
        const user = await getUserById(userId);

        if (!user) {
            await addUser(userId);
            await ctx.reply('Вы начали разговор с помощником. Теперь вы можете отправлять вопросы.');
        } else {
            await updateUserById(userId,{dialog:true});
            await ctx.reply('Вы можете оправить сообщение в чат');
        }
    } catch (error) {
        console.error('Error during user verification:', error);
        await ctx.reply('Произошла ошибка при проверке пользователя. Пожалуйста, повторите попытку позже.');
    }
});


bot.on("message", async (ctx) => {
    const session = await ctx.session;

    if (session && session.blockMessage) {
        await ctx.reply('Дождитесь выполнения запроса');
        return;
    }

    const userId = ctx.from.id;
    const message = ctx.message.text;

    try {
        const user = await getUserById(userId);

        if (user && user?.dialog) {
            ctx.session.blockMessage = true;
            const messageWait = await bot.api.sendMessage(userId, 'Пожалуйста, подождите ⌛⌛⌛');
            const messages = [
                {
                    role: "user",
                    content: user?.message
                },
                {
                    role: "assistant",
                    content: user?.completion
                },
                {
                    role: "user",
                    content: message
                }
            ];

            const response = await client.completion({
                model: "GigaChat:latest",
                messages: messages
            });

            let completion = response.choices[0].message.content;

            if (response.choices[0].message) {
                const inlineKeyboard = new InlineKeyboard().text(
                    'Прекратить диалог ❌',
                    'stop-dialog'
                );
                setTimeout(async () => {
                    await bot.api.deleteMessage(userId, messageWait.message_id);
                    await ctx.reply(completion, {
                        parse_mode: 'Markdown',
                        reply_markup: inlineKeyboard,
                    });
                    ctx.session.blockMessage = false;
                }, 2000);
            }

            await updateUserById(userId, { message, completion });
        }
    } catch (error) {
        await updateUserById(userId, { dialog: false });
        await ctx.reply('Что-то пошло не так');
        ctx.session.blockMessage = false;
    }
});


bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});


bot.start();
