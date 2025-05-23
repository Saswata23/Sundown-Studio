// Required Modules
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();
const app = express();

const cors = require('cors');

const corsOptions = {
    origin: "https://frontend-navy-gamma-56.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
};

app.use(cors(corsOptions));


// MongoDB Connection
const mongoURI = process.env.MONGODB_URI; // Access MongoDB URI from .env
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected')).catch(err => console.log(err));

// User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});
const User = mongoose.model('User', UserSchema);

// Contact Form Schema
const ContactSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    company: String,
    message: String,
    createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Allows server to parse JSON data

app.use(express.static(path.join(__dirname, 'public')));
// app.use(session({
//     secret: process.env.SESSION_SECRET, 
//     resave: false,
//     saveUninitialized: true
// }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Make sure this is true for HTTPS in production
        maxAge: 24 * 60 * 60 * 1000, // Session expires in 24 hours
        sameSite: 'None', // For cross-origin requests
    }
}));



// Landing Page (Signup/Login Options)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Signup Page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Handle Signup Request
app.post('/signup', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        return res.send('Passwords do not match!');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.send('User already exists! Try logging in.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.redirect('/login');
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.json({ success: true, message: "Login successful!" });
    } else {
        res.json({ success: false, message: "Invalid credentials" });
    }
});



// Protected Main Sundown Studio Site
app.get('/main', (req, res) => {
    console.log(req.session);
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'sundown_auth.html')); // Your actual website file
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/'); // Redirect back to landing page after logout
    });
});

app.post('/api/contact', async (req, res) => {
    try {
        const { firstName, lastName, email, company, message } = req.body;

        const newContact = new Contact({
            firstName,
            lastName,
            email,
            company,
            message
        });

        await newContact.save();
        res.status(201).json({ success: true, message: "Message sent successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Start Server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
