import express from "express"
import 'dotenv/config';
const app = express()
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
		console.log('Response:', response["results"].at(-1));
	 return response["results"].at(-1)
	} catch (e) {
		console.error('An error happened:', e);
	}
}


app.get('/', (req, res) => {
	getApiData()
	example_listTickers()
	res.render("index")
})

app.get('/sim',async (req,res)=>{
	var stockData = await appleStats("AAPL")
	var nKey = "color"
	stockData[nKey] = "blue"
	nKey = "name"
	stockData[nKey] = "apple"
	
	var stockData2 = []
	stockData2.push(stockData)
	
	// add stuff to dictionary that is used in sim.ejs

	
	console.log("data:", stockData2)
	res.render("sim",{data:stockData2,port:portfolio})
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
	res.render("sim",{data:stockData2})
})

app.listen(3000, () => {
	console.log(`Example app listening on port ${3000}`)
})

// create mongo account and set up mongo connection to account