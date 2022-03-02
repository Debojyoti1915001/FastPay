const User = require('../models/User')
const Bills = require('../../public/js/bills')
const Bankdetails = require('../models/Bankdetails')
const Touchpoint = require('../models/Touchpoint')
const jwt = require('jsonwebtoken')
const { signupMail } = require('../config/nodemailer')
const path = require('path')
const { handleErrors, generateShortId } = require('../utilities/Utilities')
const crypto = require('crypto')
require('dotenv').config()
const { nanoId, random } = require('nanoid')
const mongoose = require('mongoose')

const maxAge = 30 * 24 * 60 * 60

// controller actions
module.exports.signup_get = (req, res) => {
    res.render('signup', {
        type: 'signup',
    })
}

module.exports.login_get = (req, res) => {
    res.render('signup', {
        type: 'login',
    })
}
module.exports.signup_post = async (req, res) => {
    const { name, email, adhaar, password, confirmPwd } = req.body
    // console.log("in sign up route",req.body);
    if (password != confirmPwd) {
        req.flash('error_msg', 'Passwords do not match. Try again')
        res.status(400).redirect('/')
        return
    }

    try {
        const userExists = await User.findOne({ email })
        if (userExists) {
            req.flash(
                'success_msg',
                'This email is already registered. Try logging in'
            )
            return res.redirect('/')
        }
        // console.log("Short ID generated is: ", short_id)
        const user = new User({ email, name, password, adhaar })
        let saveUser = await user.save()
        // console.log(saveUser);
        req.flash(
            'success_msg',
            'Registration successful. Check your inbox to verify your email'
        )
        signupMail(saveUser, req.hostname, req.protocol)
        //res.send(saveUser)
        res.redirect('/')
    } catch (err) {
        const errors = handleErrors(err)
        // console.log(errors)

        var message = 'Could not signup. '.concat(
            errors['email'] || '',
            errors['password'] || '',
            errors['name'] || ''
        )
        //res.json(errors);
        req.flash('error_msg', message)
        console.log(req.body)
        res.status(400).redirect('/user/signup')
    }
}
module.exports.emailVerify_get = async (req, res) => {
    try {
        const userID = req.params.id
        const expiredTokenUser = await User.findOne({ _id: userID })
        const token = req.query.tkn
        // console.log(token)
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                req.flash(
                    'error_msg',
                    ' Your verify link had expired. We have sent you another verification link'
                )
                signupMail(expiredTokenUser, req.hostname, req.protocol)
                return res.redirect('/')
            }
            const user = await User.findOne({ _id: decoded.id })
            if (!user) {
                // console.log('user not found')
                res.redirect('/')
            } else {
                const activeUser = await User.findByIdAndUpdate(user._id, {
                    active: true,
                })
                if (!activeUser) {
                    // console.log('Error occured while verifying')
                    req.flash('error_msg', 'Error occured while verifying')
                    res.redirect('/')
                } else {
                    req.flash(
                        'success_msg',
                        'User has been verified and can login now'
                    )
                    // console.log('The user has been verified.')
                    // console.log('active', activeUser)
                    res.redirect('/')
                }
            }
        })
    } catch (e) {
        // console.log(e)
        //signupMail(user,req.hostname,req.protocol)
        res.redirect('/')
    }
}

module.exports.login_post = async (req, res) => {
    const { email, password } = req.body
    // console.log('in Login route')
    //  console.log('req.body',req.body)
    try {
        const user = await User.login(email, password)
        // console.log("user",user)

        const userExists = await User.findOne({ email })
        //    console.log("userexsits",userExists)

        if (!userExists.active) {
            const currDate = new Date()
            const initialUpdatedAt = userExists.updatedAt
            const timeDiff = Math.abs(
                currDate.getTime() - initialUpdatedAt.getTime()
            )
            if (timeDiff <= 10800000) {
                // console.log("Email already sent check it")
                req.flash(
                    'error_msg',
                    `${userExists.name}, we have already sent you a verify link please check your email`
                )
                res.redirect('/')
                return
            }
            req.flash(
                'success_msg',
                `${userExists.name}, your verify link has expired we have sent you another email please check you mailbox`
            )
            signupMail(userExists, req.hostname, req.protocol)
            await User.findByIdAndUpdate(userExists._id, {
                updatedAt: new Date(),
            })
            // console.log('userExists',userExists)
            res.redirect('/')
            return
        }

        const token = user.generateAuthToken(maxAge)

        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })
        // console.log(user);
        //signupMail(saveUser)
        //    console.log("logged in")
        req.flash('success_msg', 'Successfully logged in')
        res.status(200).redirect('/')
    } catch (err) {
        req.flash('error_msg', 'Invalid Credentials')
        // console.log(err)
        res.redirect('/')
    }
}

module.exports.logout_get = async (req, res) => {
    // res.cookie('jwt', '', { maxAge: 1 });
    // const cookie = req.cookies.jwt
    res.clearCookie('jwt')
    req.flash('success_msg', 'Successfully logged out')
    res.redirect('/')
}
module.exports.addBank_post = async (req, res) => {
    // res.send(req.user)
    const { name, accountNumber, mobileNumber, ifscCode, branch, city, state } =
        req.body
    try {
        const newBankdetails = await new Bankdetails({
            name,
            accountNumber,
            mobileNumber,
            ifscCode,
            branch,
            city,
            state,
        }).save()

        if (!newBankdetails) {
            //req.flash('error_msg','  can not be created');
            return res.send('Failed')
        }
        const userBanks = req.user.bank
        console.log(userBanks)
        userBanks.push(newBankdetails._id)
        await User.findOneAndUpdate({ _id: req.user._id }, { bank: userBanks })
    } catch (err) {
        console.error(err)
        return res.redirect('/')
    }
    console.log(req.body)
    //   res.status(201).send('Bank details added successfully');
    res.send(req.user)
}
module.exports.addBank_get = async (req, res) => {
    // res.send(req.user)
    res.render('form')
}
module.exports.automateBills_get = async (req, res) => {
    var arrayOfAutomatedBills = req.user.automated
    var arrayOfBills = req.user.bills
    var date = new Date().toISOString()
    // date = date.toISOString().substring(0, 10)
    var time = req.user.time
    if (arrayOfBills.length == 0) {
        // arrayOfBills=[]
        for (var i = 0; i < 6; i++) {
            console.log()
            var v = (Math.random() * 1000).toFixed(2)
            var val = ((v + 3000) % 4000) + 1000
            arrayOfBills.push(val)
        }
        // to be fetched from govt api
        await User.findOneAndUpdate(
            { _id: req.user._id },
            { bills: arrayOfBills }
        )
    }
    if (time.length === 0) time = new Array(6).fill('0')
    for (var i = 0; i < 6; i++) {
        console.log(date, ' ', time[i])
        if (time[i] !== '0' && date >= time[i]) {
            console.log('yes')
            var v = (Math.random() * 1000).toFixed(2)
            var val = ((v + 3000) % 4000) + 1000
            arrayOfBills[i] = val
            time[i] = '0'
            if (arrayOfAutomatedBills.includes(i)) {
                arrayOfAutomatedBills.splice(
                    arrayOfAutomatedBills.indexOf(i),
                    1
                )
            }
            await User.findOneAndUpdate(
                { _id: req.user._id },
                { automated: arrayOfAutomatedBills }
            )
        }
    }
    await User.findOneAndUpdate({ _id: req.user._id }, { bills: arrayOfBills })
    await User.findOneAndUpdate({ _id: req.user._id }, { time: time })
    res.render('billsautomate', { arrayOfAutomatedBills, arrayOfBills })
}
module.exports.automateBills_post = async (req, res) => {
    var id = req.params.id
    var addDays = req.body.quantity
    var time = req.user.time
    var date = new Date()
    console.log(time)
    if (time.length === 0) time = new Array(6).fill('0')
    if (addDays !== null) {
        date.setDate(date.getDate() + parseInt(addDays) )
        console.log(date)
        if (time[id] === '0') {time[id] = date.toISOString()
        }
        else time[id] = '0'
        console.log(time)
        await User.findOneAndUpdate({ _id: req.user._id }, { time })
    } else time[id] = '0'
    var arrayOfAutomatedBills = req.user.automated
    if (!arrayOfAutomatedBills.includes(id)) {
        arrayOfAutomatedBills.push(id)
    } else {
        arrayOfAutomatedBills.splice(arrayOfAutomatedBills.indexOf(id), 1)
    }
    await User.findOneAndUpdate(
        { _id: req.user._id },
        { automated: arrayOfAutomatedBills }
    )
    // console.log(arrayOfAutomatedBills)
    res.redirect('/user/automateBills')
}
module.exports.becometouchpoint_get = async (req, res) => {
    res.render('touchpoint')
}
module.exports.becometouchpoint_post = async (req, res) => {
    const { name, phone , address, city,zip } = req.body
    const user=req.user
    try {
    const newtouchpoint = await new Touchpoint({
        name, 
        phone, 
        address, 
        city, 
        user:user._id,
        zip
    }).save()
    console.log(newtouchpoint)
    // if (!Touchpoint) {
    //     //req.flash('error_msg','  can not be created');
    //     return res.send('Failed')
    // }
    const arrayOfTouchPoint = req.user.touchPoint
    console.log(arrayOfTouchPoint)
    arrayOfTouchPoint.push(newtouchpoint._id)
    await User.findOneAndUpdate({ _id: req.user._id }, { touchPoint: arrayOfTouchPoint })
    res.redirect('/user/becometouchpoint')
} catch (err) {
    console.error(err)
    return res.redirect('/')
}
}
module.exports.findtouchpoint_get = async (req, res) => {
    const byAddress = []
    const byCity = []
    const byZip = [] 
    res.render('findtouchpoint', {byAddress,byCity,byZip})
}
module.exports.findtouchpoint_post = async (req, res) => {  
    const id = req.params.id
    var byAddress = []
    var byCity = []
    var byZip = [] 

    //byaddress
    if(id==1){
        byAddress = await Touchpoint.find({address: req.body.filter}, function(err, data){
            if(err){
                console.log(err);
                return
            }
        
            if(data.length == 0) {
                console.log("No record found")
                return
            }

        })
    }
    if(id==2){
       byCity = await Touchpoint.find({city: req.body.filter}, function(err, data){
            if(err){
                console.log(err);
                return
            }
        
            if(data.length == 0) {
                console.log("No record found")
                return
            }
        })
    }  
    if(id==3){
        byZip = await Touchpoint.find({zip: req.body.filter}, function(err, data){
            if(err){
                console.log(err);
                return
            }
        
            if(data.length == 0) {
                console.log("No record found")
                return
            }
        })
    }       
    for(var i=0;i<byAddress.length;i++){
        await byAddress[i].populate('user').execPopulate()
    }
    for(var i=0;i<byCity.length;i++){
        await byAddress[i].populate('user').execPopulate()
    }
    for(var i=0;i<byZip.length;i++){
        await byAddress[i].populate('user').execPopulate()
    }
    res.send({byAddress,byCity,byZip})
    //res.render('findtouchpoint', {byAddress,byCity,byZip})
}