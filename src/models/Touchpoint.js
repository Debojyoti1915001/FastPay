const mongoose = require('mongoose')

const touchpoint = mongoose.Schema({
    name: {
        type: String,
        trim: true,
    },

    phone: {
        type: String,
        trim : true
    },
    user : {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
    },
    address : {
        type : String,
        trim : true
    },
    city : {
        type : String,
        trim : true
    },
    zip : {
        type : String,
        trim : true
    },
})

const Touchpoint = mongoose.model('Touchpoint', touchpoint)

module.exports = Touchpoint