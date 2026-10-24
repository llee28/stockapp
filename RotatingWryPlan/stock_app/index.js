import express from "express"
import 'dotenv/config';
import mongoose from "mongoose"
import cookieParser from "cookie-parser"
const dbURI = process.env.MONGO_URL;
import crypto from "crypto" 
import session from "express-session"
import connectMongoDBSession from 'connect-mongodb-session'
const MongoDBSession = connectMongoDBSession(session)
const app = express()
var userSchema = "";
var userModel = null;

var localSessionData = {} 
/* 

format for 

localSessionData = {

 cookievalue1 : { userdata1 },
 cookievalue2 : { userdata2 }

}

*/ 

mongoose.connect(dbURI, {dbName:"stockapp"}).then(() => {
 console.log(" ===== bruh: connected ======")

 userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // excluded from queries by default
    },
    watchlist: {
      type: [String], // e.g. ["AAPL", "TSLA"]
      default: [ ],
    },
  },
  { timestamps: true } // adds createdAt and updatedAt
);
//const Kitten = mongoose.model('Kitten', kittySchema);
userModel = mongoose.model("User",userSchema)
})
.catch((error) => {
	console.log("=====bruh: mongo connection error======")
	console.log(error)
})

const store = new MongoDBSession({
	uri: dbURI,
	collection: 'mySessions'
})


app.use(express.urlencoded({extended:true}))
app.use(session({
	secret: "stocksign",
	resave: false,
	saveUninitialized: false,
	store: store,
	rolling: true, // optional: resets the timer on each request (idle timeout)
	cookie: {
		maxAge: 1000 * 60 * 60, // 1 hour
	},
}))
const iAuth = (req,res,next) => {
	if(req.session.isAuth){
		next()
	} else{
		res.redirect("/login")
	}
}
const key = process.env.MASSIVE_API_KEY
var portfolio = {
	stocks:[
		{
			"ticker":"AAPL",
			"own":15,
			"cost basis":205,
			"purchase date": new Date(2026,2,10,2,30),
			"color": "blue",
		},
		{
			"ticker":"SPCX",
			"own":30,
			"cost basis":150,
			"purchase date": new Date(2026,2,10,2,31),
			"color":"yellow",
		},
	]
	
	
}

import {restClient} from '@massive.com/client-js'
const rest = restClient(key, 'https://api.massive.com');
var stock = ""



app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(cookieParser())
async function getApiData(){
	try {
		const response = await rest.getStocksAggregates(
			{
				stocksTicker:"AAPL",
				multiplier:"1",
				timespan:"day",
				from:"2026-08-17",
				to:"2026-08-21",
				adjusted:"true",
				sort:"asc",
				limit: "10"
			}
		)
		//console.log('Response:',response);
		
	} catch(e){
		console.error('An error happened',e)
	}
}

async function example_listTickers(){
	try{
		const response = await rest.listTickers(
			{
				market:"stocks",
				active:"true",
				order:"asc",
				limit:"1",
				sort:"ticker",
				search:"apple"
			}
		);
		// console.log('Response:',response);
	} catch (e){
		console.error('An error happened:', e)
	}
}
async function appleStats(a) {
	try {
		const response = await rest.getStocksAggregates(
			{
				stocksTicker: a,
				multiplier: "1",
				timespan: "day",
				from: "2026-07-30",
				to: "2026-08-29",
				adjusted: "true",
				sort: "asc",
				limit: "120"
			}
		);
		var results = response["results"]
		var last = results.at(-1)
		last["prev close"] = results.length > 1 ? results.at(-2).c : last.o
		// console.log('Response:', last);
		return last
	} catch (e) {
		console.error('An error happened:', e);
	}
}

// portfolio stocks + latest price info, used for the cards in sim.ejs
async function portfolioCards() {
	var cards = []
	for (let s of portfolio["stocks"]) {
		var card = {...s}
		var stats = await appleStats(s["ticker"])
		if (stats) {
			card["price"] = stats.c
			card["chg"] = stats.c - stats["prev close"]
			card["chgPct"] = card["chg"] / stats["prev close"] * 100
			card["ret"] = (stats.c - s["cost basis"]) / s["cost basis"] * 100
		}
		cards.push(card)
	}
	return cards
}


app.get('/', (req, res) => {
	getApiData()
	example_listTickers()
	res.render("index")
})

app.get('/sim', iAuth, async (req,res)=>{
	
	// if (req.cookies["cookiename"] in localSessionData){
	// 	var cards = await portfolioCards()
	// 	// console.log("cards:", cards)
	// 	res.render("sim",{cards:cards})
	// }else{
	// 	res.redirect("/login")
	// }
	var cards = await portfolioCards()
	res.render("sim",{cards:cards})
})

app.post('/sim',iAuth, async (req,res) =>{
	/**
	 * change the current user schema for this to work:
	 * 1. add money,
	 * 2. add portfolio to track stocks and amount of stocks a user owns
	 * 
	 * 
	 * modify the sim post route such that:
	 * 1. inspect if cookie is valid ( to verify if the user is login)
	 * 2. if valid check if the user can actual afford the order
	 * 3. then write/ update the stock data 
	 */
	console.log(req.body)
	let info = req.body
	var stockData = await appleStats(info["ticker"])
	var nKey = "color"
	stockData[nKey] = "blue"
	nKey = "name"
	stockData[nKey] = "apple"
	var stockData2 = []
	stockData2.push(stockData)
	var cards = await portfolioCards()
	res.render("sim",{data:stockData2,cards:cards})
})

app.get('/login', (req,res) => {
	res.render("login")
})

app.post('/login',async (req,res) => {
	//write login logic 
	// 1. extract data from form in request body
	// 2. check if username exist in DB
	// 3. if it exist then compare password from form against database password

	var info = req.body // 
	var result = await userModel.find({
		email : info["email"],
		password: info["password"],
	})

	console.log("result:",result)
	let isAuth; 

	if (result.length == 1){
		isAuth= true
		let uuid = crypto.randomUUID()

		localSessionData[uuid] = {
			"private userdata" : "some private info"
		}

		console.log("set cookie!")
	}else{
		isAuth= false
	}
	
	if (isAuth){
		req.session.isAuth = true
		res.redirect("/sim")

	}else{
		res.send("login info incorrect")
	}
})


app.get('/signup',(req,res) => {
	res.render("signup")
})

app.post('/signup',async (req,res)=>{
	// console.log(req.body)
	const {username, email,password} = req.body;
	console.log({email})
	let user = await userModel.findOne({email});
	if (user){
		return res.redirect("/signup")
	}
	user = new userModel({
		username,
		email,
		password
	})
	var result = await user.save()
	res.redirect("/login")
	// const user1 = new userModel({username : req.body["username"], email: req.body["email"],password: req.body["password"]});
	// var result = await user1.save()
	// res.send("hi")
})
app.post("/logout",(req,res) => {
	res.clearCookie("connect.sid")
	req.session.destroy((err) =>{
		if(err) throw err;
		res.redirect("/")
	})
})

app.listen(3000, () => {
	console.log(`Example app listening on port ${3000}`)
})

// create mongo account and set up mongo connection to account