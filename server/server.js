// Import required modules
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


// Create a transporter
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'alexvarenhorst@gmail.com', // your Gmail email address
        pass: '2236 1590' // your Gmail password
    }
});

// Create an instance of Express
const app = express();
app.use(cors());
app.options('*', cors());

// Body parser middleware
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/cheeseblock', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

const Schema = mongoose.Schema;
const timeSchema = new Schema({
    url: {
        type: String,
        required: true
    },
    timeRepresentation: {
        type: Array,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const commentSchema = new Schema({
    url: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required:true
    },
    seconds: {
        type: Number,
        required: true
    },
    formattedTime: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    } 
});

const userSchema = new Schema({
    uuid: {
        type: String,
        required: true
    },
    verificationKey:{
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    nickName: {
        type:String,
        required: false
    },
    isActive:{
        type:Boolean,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    } 
})

const timeModel = mongoose.model('timeModel', timeSchema);
const commentModel = mongoose.model('commentModel', commentSchema);
const userModel = mongoose.model('userModel',userSchema);

app.get("/", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "1800");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader( "Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, PATCH, OPTIONS" ); 
 });


//POST TIMES
app.post('/times', async (req, res) => {
    const requestBody = req.body;


    if(!requestBody.payload){
        res.status(500).send('Times are required');
    } else {
        try {
            const requestBody = req.body;

            let times = requestBody.payload;
            let url = requestBody.url;
            const record = await searchOrCreateTimes(url, times);
            res.status(200).json({ record });
        } catch (error) {
            console.error("Error occurred:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

//GET TIMES
app.get('/times', async (req, res) => {
     try {
        let url = req.query.url;

        if (url.includes('&')) {
            url = url.split('&')[0];
        }

        const record = await timeModel.findOne({ url });

        if (record) {
            res.status(200).json({ record });
        } else {
            res.status(404).json({ error: "Record not found" });
        }
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST COMMENTS
app.post('/comments', async (req, res) => {
    const requestBody = req.body;

    if(!requestBody.payload){
        res.status(500).send('Comments are required');
    } else {
        const requestBody = req.body;
        let times = requestBody.payload;
        let url = requestBody.url;
        let uuid = requestBody.uuid;
        let hasPermission = await verifyUUID(uuid);

        try {
            if(hasPermission){
                const record = await searchOrCreateComments(url, times);
                res.status(200).json({ 'status':'success' });
            } else {
                res.status(400).json({'error': "No permission to add comments"});
            }
        } catch (error) {
            console.error("Error occurred:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

//GET COMMENTS
app.get('/comments', async (req, res) => {
     try {
        let url = req.query.url;

        if (url.includes('&')) {
            url = url.split('&')[0];
        }

        const records = await commentModel.find({ url });

        if (records) {
            res.status(200).json({ records });
        } else {
            res.status(404).json({ error: "No Records found" });
        }
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


//POST - Create CAPTCHA USER
app.post('/captchaUser', async (req, res) => {
    const requestBody = req.body;

    if(!requestBody.uuid){
        res.status(500).send('UUID is required');
    } else {
        try {
            const requestBody = req.body;

            let verificationKey = crypto.randomBytes(20).toString('hex');
            let uuid = requestBody.uuid;

            const record = await createCaptchaUser(uuid,verificationKey);
            //Do some error handling here in case there is already a uuid account.

            res.status(200).json({ 'status':'success' });
        } catch (error) {
            console.error("Error occurred:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

//POST - Create USER
app.post('/createUser', async (req, res) => {
    const requestBody = req.body;

    if(!requestBody.uuid){
        res.status(500).send('UUID is required');
    } else {
        try {
            const requestBody = req.body;

            let uuid = requestBody.uuid;
            let username = requestBody.username;
            let email = requestBody.email;
            let verificationKey = crypto.randomBytes(20).toString('hex');

            const record = await createUserAccount(uuid,username,email,verificationKey);
            //Do some error handling here in case there is already a uuid account.

            res.status(200).json({ 'status':'success' });
        } catch (error) {
            console.error("Error occurred:", error);
            res.status(500).json({ error: error });
        }
    }
});

//POST - Verify link sent to email. 
/*
    Assosiate a key to each account upon creation. 
*/
app.get('/verify/:token', async (req, res) => {
    const verificationKey = req.params.token;

    if(!verificationKey){
        res.status(500).send('Token is required');
    } else {
        try {
            let existingRecord = await userModel.findOne({ verificationKey });

            if(existingRecord){
                let myquery = { 'verificationKey': verificationKey };
                let newvalues = { $set: {isActive: true} };
                await userModel.updateOne(myquery,newvalues,null);
            }

            res.status(200).json({ 'status':'success' });
        } catch (error) {
            console.error("Error occurred:", error);
            res.status(500).json({ error: error });
        }
    }
});


async function searchOrCreateTimes(url, timeRepresentation) {
    try {
        // Search for a record with the given URL
        let existingRecord = await timeModel.findOne({ url });

        if (existingRecord) {
            const id = existingRecord.id;
            let newTimeRep = existingRecord.timeRepresentation;

            for(let secondIndex in timeRepresentation){
                newTimeRep[secondIndex] += timeRepresentation[secondIndex];
            }

            const filter = { _id: new ObjectId(id) };
            const update = { $set: { 
                "timeRepresentation": newTimeRep
            }};

            const result = await timeModel.updateOne(filter, update, null);

            return result;
        } else {
            // If a record doesn't exist, create a new one
            const newRecord = new timeModel({ url, timeRepresentation });
            await newRecord.save();
            return newRecord;
        }
    } catch (error) {
        console.error("Error occurred:", error);
        throw error;
    }
}

async function searchOrCreateComments(url, payload) {
    try {
        let comments = payload.comments;
        let url = payload.url;

        for(let comment of comments){
            let text = comment['text'];
            let seconds = comment['seconds'];
            let formattedTime = comment['formattedTime'];
            let existingRecord = await commentModel.findOne({ url, text });

            if(!existingRecord){
                const newRecord = new commentModel({ url, text, seconds, formattedTime});
                await newRecord.save();
            }
        }

        return 'success';
    } catch (error) {
        console.error("Error occurred:", error);
        throw error;
    }
}

async function createCaptchaUser(uuid,verificationKey){
    try {

        console.log('Creating account');

        let existingRecord = await userModel.findOne({ uuid });

        if(!existingRecord){
            const newRecord = new userModel({ 'uuid': uuid, 'isActive': true, 'verificationKey':verificationKey });
            await newRecord.save();
        } else {
            console.error('Failed to create user');
        }

        return 'success';
    } catch (error) {
        console.error("Error occurred:", error);
        throw error;
    }
}

async function createUserAccount(uuid,username,email,verificationKey){
    try {
        console.log('Creating account');

        let existingRecord = await userModel.findOne({ email });

        if(!existingRecord){
            const newRecord = new userModel({ 'uuid': uuid, 'nickName':username, 'email':email, 'isActive': false, 'verificationKey':verificationKey });
            await newRecord.save();
            console.log('User created with email ' + email);
            // sendEmail(username,email,verificationKey);
        } else {
            throw "Username, and email are already in use.";
        }

        return 'success';
    } catch (error) {
        console.error("Error occurred:", error);
        throw error;
    }
}


async function verifyUUID(uuid){
     try {
        let existingRecord = await userModel.findOne({ uuid });

        if(existingRecord){
            console.log('verified');
            return true;
        }

        return false;
    } catch (error) {
        console.error("Error occurred:", error);
        throw error;
    }
}

async function sendEmail(username,email,token){
    let mailOptions = {
        from: 'alexvarenhorst@gmail.com',
        to: email,
        subject: 'Cheeseblock Verification',
        text: 'test' + token
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error occurred:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
