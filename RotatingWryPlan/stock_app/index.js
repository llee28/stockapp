import express from "express"
import 'dotenv/config';
import mongoose from "mongoose"
const dbURI = process.env.MONGO_URL;
const app = express()
var userSchema = "";
var userModel = null;
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



app.use(express.urlencoded({extended:true}))
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
		console.log('Response:',response);
		
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
		console.log('Response:',response);
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
		console.log('Response:', last);
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

app.get('/sim',async (req,res)=>{
	var cards = await portfolioCards()
	console.log("cards:", cards)
	res.render("sim",{cards:cards})
})

app.post('/sim',async (req,res) =>{
	let info = req.body
	var stockData = await appleStats(info["ticker"])
	console.log ("stockData post:",stockData)
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

app.get('/signup',(req,res) => {
	res.render("signup")
})

app.post('/signup',async (req,res)=>{
	console.log(req.body)
	const user1 = new userModel({username : req.body["username"], email: req.body["email"],password: req.body["password"]});
	var result = await user1.save()
	res.send("hi")
})

app.listen(3000, () => {
	console.log(`Example app listening on port ${3000}`)
})

// create mongo account and set up mongo connection to account