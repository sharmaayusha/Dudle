const Users = require('../models/userModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const sendMail = require('./sendMail')


const{CLIENT_URL} = process.env

const userCtrl = {
    register: async(req,res) => {
        try{
            const{name, email, Phone_Number, Adhaar_Number, Shop_Name, Password} = req.body
            if(!name||!email||!Phone_Number||!Adhaar_Number||!Shop_Name||!Password)
            return res.status(400).json({msg:"Please fill in all the fields!"})


            if(!validateEmail(email))
            return res.status(400).json({msg:"Invalid Email!"})

            const user = await Users.findOne({email})
            if(user)return res.status(400).json({msg:"Email already exists!"})

            if(Password.length < 6)
            return res.status(400).json({msg:"Password must be at-least 6 characters!"})

            const PasswordHash = await bcrypt.hash(Password, 12)
            
            const newUser = {
                name, email,Phone_Number,Adhaar_Number,Shop_Name, Password: PasswordHash
            }
            const activation_token = createActivationToken(newUser)
            
            const url = `${CLIENT_URL}/user/activate/${activation_token}`
            sendMail(email, url,"Verify your email address")

            res.json({msg:"Register Success. Please activate your email to start"})
        } catch(err){
            return res.status(500).json({msg:err.message})
        }
    },
    activateEmail: async (req, res) => {
        try {
            const {activation_token} = req.body
            const user = jwt.verify(activation_token, process.env.ACTIVATION_TOKEN_SECRET)
            const {name, email, Phone_Number, Adhaar_Number, Shop_Name, Password} = user

            const check = await Users.findOne({email})
            if(check) return res.status(400).json({msg:"This email already exists."})
            
            const newUser = new Users({
                name, email, Phone_Number, Adhaar_Number, Shop_Name, Password
            })
            
            await newUser.save()

            res.json({msg: "Account has been activated!"})


        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    login: async (req, res) => {
        try {
            const {email, Password} = req.body
            const user = await Users.findOne({email})
            if(!user) return res.status(400).json({msg: "This email does not exist."})

            const isMatch = await bcrypt.compare(Password, user.Password)
            if(!isMatch) return res.status(400).json({msg: "Password is incorrect."})

            const refresh_token = createRefreshToken({id: user._id})
            res.cookie('refreshtoken', refresh_token, {
                httpOnly: true,
                path: '/user/refresh_token',
                maxAge: 90*24*60*60*1000 // 90 days
            })

            res.json({msg: "Login success!"})
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    getAccessToken: (req, res) => {
        try {
            const rf_token = req.cookies.refreshtoken
            if(!rf_token) return res.status(400).json({msg: "Please login now!"})
            jwt.verify(rf_token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
                if(err) return res.status(400).json({msg: "Please login now!"})

                const access_token = createAccessToken({id: user.id})
                res.json({access_token})
            })
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    forgotPassword: async(req,res)=>{
        try {
            const {email} = req.body
            const user = await Users.findOne({email})
            if(!user) return res.status(400).json({msg: "This email does not exist."})

            const access_token = createAccessToken({id: user._id})
            const url = `${CLIENT_URL}/user/reset/${access_token}`

            sendMail(email, url, "Reset your password")
            res.json({msg: "Re-send the password, please check your email."})
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    resetPassword: async (req, res) => {
        try {
            const {Password} = req.body
            console.log(Password)
            const PasswordHash = await bcrypt.hash(Password,12)
            console.log(req.user)
            await Users.findOneAndUpdate({_id: req.user.id },{
                Password: PasswordHash
            })
            res.json({msg:"Password successfully change!"})
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    getUserInfor: async (req, res) => {
        try {
            const user = await Users.findById(req.user.id).select('-Password')

            res.json(user)
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    getUsersAllInfor: async (req, res) => {
        try {
            const users = await Users.find().select('-password')

            res.json(users)
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    logout: async (req, res) => {
        try {
            res.clearCookie('refreshtoken', {path: '/user/refresh_token'})
            return res.json({msg: "Logged out."})
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    updateUser: async (req, res) => {
        try {
            const {name, avatar} = req.body
            await Users.findOneAndUpdate({_id: req.user.id}, {
                name, avatar
            })

            res.json({msg: "Update Success!"})
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    updateUsersRole: async (req, res) => {
        try {
            const {role} = req.body

            await Users.findOneAndUpdate({_id: req.params.id}, {
                role
            })

            res.json({msg: "Update Success!"})
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
    deleteUser: async (req, res) => {
        try {
            await Users.findByIdAndDelete(req.params.id)

            res.json({msg: "Deleted Successfully!"})
        } catch (err) {
            return res.status(500).json({msg: err.message})
        }
    },
}

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

const createActivationToken = (payload) => {
    return jwt.sign(payload,process.env.ACTIVATION_TOKEN_SECRET,{expiresIn:'5d'})
}

const createAccessToken = (payload) => {
    return jwt.sign(payload,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'15d'})
}

const createRefreshToken = (payload) => {
    return jwt.sign(payload,process.env.REFRESH_TOKEN_SECRET,{expiresIn:'25d'})
}

module.exports = userCtrl