const mongoose = require('mongoose');
const Schema = mongoose.Schema

const userSchema = new Schema({
    id:{
        type:Number,
        required:true,
    },
    message:{
        type:String,
    },
    completion:{
        type:String,
    },
    dialog:{
        type:Boolean,
        required: true,
    }
},{timestamps:true})

const User = mongoose.model('User',userSchema);

module.exports = User