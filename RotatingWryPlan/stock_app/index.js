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
	cash: {
		type: Number,
		default: 10000,
	},
  },
  { timestamps: true } // adds createdAt and updatedAt
);
//const Kitten = mongoose.model('Kitten', kittySchema);
userModel = mongoose.model("User",userSchema)
})
.catch((error) => {
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
	stocks:[]
	
	
}

import {restClient} from '@massive.com/client-js'
const rest = restClient(key, 'https://api.massive.com');
var stock = ""



app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(cookieParser())

async function appleOpen(ticker,date) {
  try {
	console.log(ticker)
    const response = await rest.getStocksOpenClose(
      {
        stocksTicker: ticker,
        date: date,
        adjusted: "true"
      }
    );
   return response;
  } catch (e) {
    console.error('An error happened:', e);
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
async function appleStats(a,date) {
	try {
		const response = await rest.getStocksAggregates(
			{
				stocksTicker: a,
				multiplier: "1",
				timespan: "day",
				from: date,
				to: date,
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
		var stats = await appleStats(s["ticker"],"2026-10-23")
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

function getStocks(listStocks){
	var tempList = []
	if(!listStocks.length){
		return listStocks
	}
	for(let i =0; i<listStocks.length; i++){
		tempList.push(JSON.parse(listStocks[i]))
	}
	return tempList
}
function dateLogic(){
	const date = new Date(); // Current date and time
	const timeZone = 'America/Los_Angeles'
	const day = new Intl.DateTimeFormat('en-US', {
		timeZone,
		weekday:"long"
	}).format(date)
	const ymd = new Intl.DateTimeFormat('en-CA',{
		timeZone,
		year:'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date)
	return [day,ymd]
}
function weekdayLogic(inputDate){
	let splitDate = inputDate[1].split("-")
	let finalDate = ""
	
	if(inputDate[0]=="Sunday"){
		splitDate[2] = splitDate[2]-2
		splitDate[2] = monthLogic(splitDate[2],splitDate)
		splitDate[2] = String(splitDate[2])
		finalDate = splitDate.join().replaceAll(",","-")
	}
	else if(inputDate[0]=="Monday"){
		splitDate[2] = splitDate[2]-3
		splitDate[2] = monthLogic(splitDate[2],splitDate)
		splitDate[2] = String(splitDate[1])
		finalDate = splitDate.join().replaceAll(",","-")
	}
	else{
		splitDate[2] = splitDate[2]-1
		splitDate[2] = monthLogic(splitDate[2],splitDate)
		splitDate[2] = String(splitDate[2])
		finalDate = splitDate.join().replaceAll(",","-")
	}
	return finalDate
}
function monthLogic(inputDay,inputSplit){
	let temp = ""
	let listThirtyOne = [1,3,5,7,8,10,12]
	let listThirty = [4,6,9,11]
	if(inputDay<1){
		if(inputSplit[1].parseInt(10) in listThirtyOne){
			temp = 31-Math.abs(inputDay)
		}
		else if(inputSplit[1].parseInt(10) in listThirty){
			temp = 30-Math.abs(inputDay)
		}
		else if(inputSplit[1].parseInt(10) == 2){
			temp = 28-Math.abs(inputDay)
		}
		return temp
	}
	if(inputDay<10){
		inputDay="0"+inputDay
	}
	return inputDay
}

app.get('/', (req, res) => {
	example_listTickers()
	res.render("index")
})

app.get('/sim', iAuth, async (req,res)=>{
	
	let totalCash = 0
	var foundUser = await userModel.findOne({email:req.session.user.email})
	let userPort = getStocks(foundUser.watchlist)
	portfolio["stocks"] = userPort

	//get me the current price of all the ticker 
	
	// all the api with the date
	for(let i=0;i<userPort.length;i++){
		totalCash += userPort[i]["bought"]*userPort[i]["cost basis"]
	}
	totalCash += foundUser.cash
	var cards = await portfolioCards()

	res.render("sim",{cards:cards,cash:totalCash,availableCash:foundUser.cash})
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
	var stockData = await appleStats(info["ticker"],"2026-10-23")
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
		req.session.user = {
			email: info["email"]
		}
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
		res.redirect("/login")
	})
})

// app.get("/buy",(req,res)=>{
	
// })
app.get("/buy",(req,res)=>{
	appleOpen("AAPL")
	res.send("hello world")
})
app.post("/buy",async (req,res)=>{
	let info = req.body
	console.log("info",info)
	var foundUser = await userModel.findOne({email: req.session.user.email})
	var stockGet = await appleOpen(info["ticker"],weekdayLogic(dateLogic()))
	let temp = 0;
	let tempList = getStocks(foundUser.watchlist)
	if(foundUser.cash >=Number(info["quantity"]*stockGet["open"])){
		foundUser.cash = foundUser.cash-Number(info["quantity"]*stockGet["open"])
		if(!tempList.length){
			foundUser.watchlist.push(JSON.stringify({"ticker":info["ticker"],"bought":info["quantity"],"price":stockGet["open"],"cost basis":stockGet["open"],"color":["yellow"]}))
	}
		else{
			for(let i=0;i<tempList.length;i++){
				for(let key in tempList[i]){
					if(tempList[i][key] == info["ticker"]){
						temp = 1
						let stockObj = getStocks(foundUser.watchlist)
						stockObj[i]["bought"] = Number(stockObj[i]["bought"])+ Number(info["quantity"])
						stockObj[i]["cost basis"] = (stockObj[i]["cost basis"]+stockGet["open"])/2
						foundUser.watchlist[i] = JSON.stringify(stockObj[i])
						
					}
				}
			// console.log(tempList[i])
			// if (info["ticker"] in tempList[i]){
			// 	temp = 1
			// 	console.log("found stock")
			// 	tempList[i]["bought"] = tempList[i]["bought"] + tempList[i]["quantity"]
			// 	tempList[i]["cost basis"] = (tempList[i]["cost basis"]+stockGet["open"])/2
			// }
	}
		if(temp == 0){
			foundUser.watchlist.push(JSON.stringify({"ticker":info["ticker"],"bought":info["quantity"],"price":stockGet["open"],"cost basis":stockGet["open"],"color":["yellow"]}))
		}
	}
	}
	else{
		res.send("not enough cash")
	}
	
	
	
	await foundUser.save()
	res.redirect("/sim")
})

app.listen(3000, () => {
	console.log(`Example app listening on port ${3000}`)
})

// create mongo account and set up mongo connection to account