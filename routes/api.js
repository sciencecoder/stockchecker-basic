/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var os = require("os");
var MongoClient = require('mongodb').MongoClient;
require("dotenv").config();
const https = require('https');

function dbConnect(callback) {

  MongoClient.connect(process.env.DATABASE, function(err, db) {
    if(err) console.error(err);
    callback(db.collection("stocklikes"), () => {
      db.close();
    })
  })

 
}
function getStockData(stock) {
 
// function getStringDate() {
//     var today = new Date();
//     var dd = ("0"+today.getDate().toString()).slice(-2);
//     var mm = ("0"+(today.getMonth() + 1).toString()).slice(-2); //January is 0!
//     var yyyy = today.getFullYear();
//     today =  yyyy + '-' + mm + '-' + dd;
//   return today;
// }
 
return new Promise((resolve, reject) => {
  //Note: API limited to 5 calls per minute on free tier
   https.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stock}&apikey=${process.env.API_KEY}`,
  (resp) => {
  let data = '';

  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });

  // The whole response has been received. Print out the result.
  resp.on('end', () => {
   data = JSON.parse(data);
   
  
  if(data.hasOwnProperty("Time Series (Daily)")) {
   var seriesDataDay = data["Meta Data"]["3. Last Refreshed"];
  // console.log("successfully obtained stockdata from API",
  // data["Time Series (Daily)"][seriesDataDay]["4. close"])
   resolve({
     stock: data["Meta Data"]["2. Symbol"],
     price: data["Time Series (Daily)"][seriesDataDay]["4. close"]
   })
  } else {
  // console.log("your request was rejected", data["Error Message"] || data)
    //console.log(data)
    reject(data || "Unknown error getting stock data from API")
  }
   
  });

}).on("error", (err) => {
  console.error(err)
  reject("There was an unknown error retrieving stock data from API")
});
})
}
//to be used in async/ await function
function getStockLikes(stockName) {
  //This is the weakest point of the app. what happens if mongoDB does not work? the app crashes
  return new Promise((resolve, reject) => {
    dbConnect((collection, close) => {
      collection.findOne({stock: stockName}, function(err, doc) {
        if(err) {
          console.error(err);
        }
          resolve(doc ? doc.like_list.length : 0);
        
        close();
      })
    })
  })
}
const compareStockController = async function(stockList, like) {
  var result = [];
  var stockLikes = [];
  try {
    for(var i = 0; i < stockList.length; i++) {
      stockList[i] = await getStockData(stockList[i]);
      stockList[i].likes = await getStockLikes(stockList[i].stock);
      
    }
  
    //hard code, I know
    if(like){
      stockLikes[0] = stockList[0].likes;
      stockLikes[1] = stockList[1].likes;
      stockList[0].rel_likes = stockLikes[0] - stockLikes[1];
      stockList[1].rel_likes = stockLikes[1] - stockLikes[0];
      delete stockList[0].likes;
      delete stockList[1].likes;
    } 
     
     
     return stockList;
     
  }
  /*
  if you do not catch the error withen the async function, it will automatically reject on an exception (i.e, rejection on an await function call)
  */
  catch (err) {
    console.error(err);
    //console.log("err in stockcontroller", err)
    return Promise.reject(err);
    
  }
 
 
}

module.exports = function (app) {
  //Enabling trust trust proxy Allows for ip checking in express request, not most reliable method
  app.enable('trust proxy');
  app.route('/api/stock-prices')
    .get(function (req, res){
     
        if(typeof req.query.stock == "string") {
          
          const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
          getStockData(req.query.stock)
          .then((stock) => {
            // console.log("api response aquired")
            dbConnect((collection, close) => {
              collection.findOne({stock: stock.stock}, function(err, doc) {
                if(err) console.error(err);
                //console.log("mongoDB Doc accessed")
                if(req.query.like && (!doc || (doc.like_list.indexOf(ip) == -1))) {
                  
                  collection.update({stock: stock.stock, like_list: {$exists: true}}, 
                  {$addToSet: {like_list: ip}},
                  {upsert: true},
                  function(err, responseDoc) {
                    if(err) console.error(err);
                    
                    collection.findOne({stock: stock.stock}, function(err, doc) {
                      if(err) console.error(err);
                      
                      stock.likes = doc.like_list.length;
                     
                      res.send({stockData: stock});
                      close()
                    })
                  })
                } 
                
                else {
                  //console.log("No new like, or like already exists");
                  stock.likes = doc ? doc.like_list.length : 0;
                 
                  res.send({stockData: stock});
                  close();
                }
              })
             
              
            })
            
           
          })
          .catch((err) => {
            
              console.error(err)
            
            res.status(400).send({stockData: {error: "Could not get stock Data"}})
          })
        }
        
        else if(Array.isArray(req.query.stock)) {
          compareStockController([req.query.stock[0], req.query.stock[1]], req.query.like)
          .then((stockData) => {
            
            res.send({stockData});
          })
          .catch((err) => {
            //console.log("error at app.get", err)
            if(err.Note) {
               res.status(503).send({stockData: {
                 error: "Maximum API calls per minute reached. Please try again after a minute."}
                 
               })
            } else {
              res.status(400).send({stockData: {error: "Could not get stock data"}})
            }
            
          })
        }
    
        
      else  {
        res.status(400).send({error: "cannot find stock in url query. Must provide stock query in url"})
      }
      
     
    });
    
};
