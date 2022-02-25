const express = require('express')
const router = express.Router()
const Contact = require('../models/Contact');
const Bankdetails = require('../models/Bankdetails');
const { contactMail } = require('../config/nodemailer');
//Route for homepage
router.get('/', (req, res) => {
    res.render('./index')
});

router.post('/contact',async(req,res)=>{
    try{
        const { name, email, subject, message } = req.body;
        if(!email.trim()){
            req.flash('error_msg','Please provide a valid email');
            res.redirect('/');
        }
        const newIssue = await new Contact({
            name,
            email,
            subject,
            message
        }).save();
        if(!newIssue){
            req.flash('error_msg','Issue cannot be created');
            return res.redirect('/');
        }
        // console.log(newIssue);
        contactMail(newIssue,'user');
        contactMail(newIssue,'admin');
        req.flash('success_msg','Your issue has been reported');
        res.redirect('/');
    }
    catch(err){
        console.error(err);
        req.flash('error_msg','Something went wrong. Try again.');
        return res.redirect('/');
    }
})

router.post('bankdetails', async(req,res)=>{
      const { name,accountNumber,mobileNumber,ifscCode,branch,city,state} = req.body;
      try{
        const newBankdetails = await new Bankdetails({
            name,
            accountNumber,
            mobileNumber,
            ifscCode,
            branch,
            city,
            state
        }).save();
        if(!newBankdetails){
            //req.flash('error_msg','  can not be created');
            return res.redirect('/');
        }
  
        }
        catch(err){
            console.error(err);
            return res.redirect('/');
        }
        console.log(req.body);
        res.status(201).send('Bank details added successfully');
});
router.get('/bankdetails',(req,res)=>{
    console.log(req.body);
});

module.exports = router
