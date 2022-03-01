const mongoose = require('mongoose')

const bankdetails = mongoose.Schema({
    name: {
        type: String,
        trim: true,
    },
    accountNumber: {
        type: String,
        trim: true,
    },
    mobileNumber: {
        type: String,
        trim: true,
    },
    ifscCode: {
        type: String,
        trim: true,
    },
    branch:{
        type: String,
        trim : true
    },
    city : {
        type: String,
        trim : true
    },
    state : {
        type : String,
        trim : true
    }
})

const Bankdetails = mongoose.model('Bankdetails', bankdetails)

module.exports = Bankdetails