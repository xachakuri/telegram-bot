const mongoose = require('mongoose');
const Schema = mongoose.Schema

const optionSchema = new Schema({
    id: { type: Number},
    text: { type: String },
    isCorrect: { type: Boolean }
});

const questionSchema = new Schema({
    id: { type: Number, required: true },
    text: { type: String},
    hasOptions: { type: Boolean },
    options: [optionSchema]
});

const Question = mongoose.model('Question',questionSchema);


module.exports = Question