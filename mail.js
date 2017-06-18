'use strict';
const nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service : "Gmail",
    auth: {
        user: 'lukas.enengel@gmail.com',
        pass: 'ILE@gwmiSm0e'
    }

});

// setup email data with unicode symbols
let mailOptions = {
    from: '"Fred Foo 👻" <foo@blurdybloop.com>', // sender address
    to: 'lukas.enengel@gmail.com', // list of receivers
    subject: 'Hello ✔', // Subject line
    text: 'Hello world ?', // plain text body
    html: '<b>Hello world ?</b>' // html body
};
console.log("start");
// send mail with defined transport object
transporter.sendMail(mailOptions, function (error, info) {
	console.log("SendMail");
    if (error) {
        return console.log(error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
});
