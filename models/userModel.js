const mongoose = require('mongoose')


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter your name!"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Please enter your email!"],
        trim: true,
        unique: true
    },
    Phone_Number: {
        type: Number,
        required: [true, "Please enter your Phone Number!"],
        trim: true,
        unique: true
    },
    Adhaar_Number: {
        type: Number,
        required: [true, "Please enter your Adhaar Number!"],
        trim: true,
        unique: true
    },
    Shop_Name: {
        type: String,
        required: [true, "Please enter your Shop Name!"],
        trim: true
    },
    Password: {
        type: String,
        required: [true, "Please enter your password!"]
    },
    role: {
        type: Number,
        default: 0 // 0 = user, 1 = admin
    },
    avatar: {
        type: String,
        default: "https://res.cloudinary.com/devatchannel/image/upload/v1602752402/avatar/avatar_cugq40.png"
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Users", userSchema)