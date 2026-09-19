import express from "express"
const app = express()
import path from "path"
const port = 3000
const key = process.env.MASSIVE_API_KEY
var portfolio = {
	stocks:[
		{
			"ticker":"AAPL",
			"own":15,
			"cost basis":205,
			"purchase date": new Date(2026,2,10,2,30)
		},
		{
			"ticker":"SPCX",
			"own":30,
			"cost basis":150,
			"purchase date": new Date(2026,2,10,2,31)
		},
	]
	
	
}

import {restClient} from '@massive.com/client-js'
const rest = restClient(key, 'https://api.massive.com');
var stock = ""

import { MongoClient, ServerApiVersion } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	}
});


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
async function appleStats() {
	try {
		const response = await rest.getStocksAggregates(
			{
				stocksTicker: "AAPL",
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



async function mong() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();
		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You successfully connected to MongoDB!");
	} finally {
		// Ensures that the client will close when you finish/error
		await client.close();
	}
}
app.get('/', (req, res) => {
	getApiData()
	example_listTickers()
	mong()
	res.render("index")
})

app.get('/sim',async (req,res)=>{
	var stockData = await appleStats()
	console.log("data:", stockData)
	res.render("sim",{data:stockData,port:portfolio})
})

app.listen(3000, () => {
	console.log(`Example app listening on port ${3000}`)
})

// create mongo account and set up mongo connection to account