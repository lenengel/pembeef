/* ================================================================================================================================
 PB-API
 ================================================================================================================================
 API RESSOURCES:

 * GET /beef
       get active beef

 * POST /beef/:id/reservation
 	     post reservation
 	     :id           ... om nr of beef

 	     json-body:    { 'amount' : 2, 'type' : 'basic', 'weigth' : 4, 'firstname' : 'Max', 'surname' : 'Muster', 'email' : 'max@muster.at', 'phone' : '06991234123' }

 ================================================================================================================================
 HISTORY:
 20170427 01v001 le
 * initial version

 ================================================================================================================================
 DESCRIPTION:
 get a site specific file(base64 encoded)

 ================================================================================================================================
 ToDo:
 *
 ================================================================================================================================ */

/* ================================================================================================================================
 REQUIRE
 ================================================================================================================================ */
const express = require('express');
const cors = require('cors');
const https = require('https');
const db = require('diskdb');
const bodyParser = require('body-parser');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const nodemailer = require('nodemailer');

/* ================================================================================================================================
 SSL OPTIONS
 ================================================================================================================================ */
var sslOptions = {
	cert: fs.readFileSync('/var/www/pb/crt/server.crt'),
	key: fs.readFileSync('/var/www/pb/crt/server.key')
};

/* ================================================================================================================================
 GMAIL TRANSPORTER - create reusable transporter object using the default SMTP transport
 ================================================================================================================================ */
let transporter = nodemailer.createTransport(JSON.parse(fs.readFileSync('/var/www/pb/gmailOptions.json')));

/* ================================================================================================================================
 MAIL - setup email data with unicode symbols
 ================================================================================================================================ */
let mailOptions = {
    from: '"PB" <info@pembeef.at>', // sender address
    to: '', // list of receivers
    subject: 'PB Order', // Subject line
    text: '' // plain text body
};

/* ================================================================================================================================
 EXPRESS SETTINGS
 ================================================================================================================================ */
var app = express();
app.use(cors());

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json 
app.use(bodyParser.json())

/* ================================================================================================================================
 MONGO DB CONNECTION
 ================================================================================================================================ */
// Use connect method to connect to the Server
MongoClient.connect('mongodb://localhost:27017/pb', function(dbError, db) {
	if (dbError)
		return console.error(dbError);

	console.log("mongo db connected");

	/* ================================================================================================================================
	 API RESSOURCE
	 GET /
	 ================================================================================================================================ */
	app.get('/', function (req, res) {
		res.json({"result": "ok"})
	});

	/* ================================================================================================================================
	 API RESSOURCE
	 GET /beef
	 ================================================================================================================================ */
	app.get('/beef', function (req, res) {
		db.collection('order').find({status: 'active'}).toArray(function (errGetBeefs, beefs) {
			if (errGetBeefs)
				return res.sendStatus(500);

			var result = [];
			beefs.forEach(function (beef) {
				result.push
				({
					id: beef['amaId'],
					name: beef['name'],
					pkgAvailable: beef['pkgEstimated'],
					pkgReserved: beef['pkgReserved']
				});
			});
			res.json(result);
		});
	});

	/* ================================================================================================================================
	 API RESSOURCE
	 POST /beef/:id/reservation
	 ================================================================================================================================ */
	app.post('/beef/:id/reservation', function (req, res) {
		if (
			!req.body || !req.body.hasOwnProperty("firstname") || !req.body.hasOwnProperty("surname") || !req.body.hasOwnProperty("email") || !req.body.hasOwnProperty("phone") || !req.body.hasOwnProperty("amount") || !req.body.hasOwnProperty("weigth") || !req.body.hasOwnProperty("type"))
			return res.sendStatus(400);

		if (req.body.firstname.length < 2 ||
			req.body.surname.length < 2 ||
			req.body.email.length < 5 ||
			req.body.phone.length < 5 ||
			parseInt(req.body.amount) < 1 ||
			parseInt(req.body.weigth) < 1 ||
			req.body.type.length < 4)
			return res.sendStatus(400);

		var update = {
			$push: {
				"reservations": {
					$each: [{
						"firstname": req.body.firstname,
						"surname": req.body.surname,
						"street": req.body.street || "",
						"streetnr": req.body.streetnr || "",
						"zip": req.body.zip || "",
						"city": req.body.city || "",
						"email": req.body.email,
						"phone": req.body.phone,
						"amount": parseInt(req.body.amount),
						"weigth": parseInt(req.body.weigth),
						"type": req.body.type
					}],
					$position: 0
				}
			},
			$inc: {
				"pkgReserved": parseInt(req.body.amount)
			}
		};

		db.collection('order').findOneAndUpdate(
			{
				'amaId': req.params.id
			}, update, function (errUpdateBeef, result) {
				if (errUpdateBeef)
					return res.sendStatus(404);

        mailOptions.to   = req.body.email;
        mailOptions.html = "<b>Bestellung</b> <br><br>" + 
                           "Vorname: " + req.body.firstname + "<br>" +
                           "Nachname: " + req.body.surname + "<br>" +
                           "Email: " + req.body.email + "<br>" +
                           "Telefon: " + req.body.phone + "<br>" +
                           "Anzahl: " + parseInt(req.body.amount) + "<br>" +
                           "Typ: " + req.body.type + "<br><br>" +
                           "Beste Grüße und einen schönen Tag ;)";
                           
        
        // send mail with defined transport object
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                return console.log(error);
            }
            console.log('Mail %s sent ...', info.messageId, info.response);
        });
				res.sendStatus(200);
			});
	});
});

/* ================================================================================================================================
 START PB API
 ================================================================================================================================ */
var server = https.createServer(sslOptions, app);

server.listen(8080, function(){
	console.log("pb api is running at port 8080")
});
