const questions = require('./questions.json');
const { Random } = require('random-js');

const helpObject = Object.freeze({
    "Сети ЭВМ": "networks",
    "Схемотехника": "circuit ",
    "Программирование": "programming",
    "Сетевые ОС": "os",
});

const getRandomQuestion = (topic) => {
    const random = new Random();

    let questionTopic = helpObject[topic] || "случайный вопрос";

    if (questionTopic === 'случайный вопрос') {
        questionTopic =
            Object.keys(questions)[
                random.integer(0, Object.keys(questions).length - 1)
                ];
    }

    const randomQuestionIndex = random.integer(
        0,
        questions[questionTopic].length - 1,
    );

    return {
        question: questions[questionTopic][randomQuestionIndex],
        questionTopic,
    };
};

const getCorrectAnswer = (topic, id) => {
    const question = questions[topic].find((question) => question.id === id);

    if (!question.hasOptions) {
        return question.answer;
    }

    return question.options.find((option) => option.isCorrect).text;
};

module.exports = { getRandomQuestion, getCorrectAnswer };