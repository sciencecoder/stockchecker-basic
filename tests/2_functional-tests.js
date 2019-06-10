/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/
/* 
Note: API free tier used in this project Alpha Vantage, only allows 5 calls per minute.
for last test case, comment out all previous ones so the API gives something back!
*/
var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

var MongoClient = require('mongodb').MongoClient;
require("dotenv").config();

function dbConnect(callback) {

  MongoClient.connect(process.env.DATABASE, function(err, db) {
    if(err) console.error(err);
    callback(db.collection("stocklikes"), () => {
      db.close();
    })
  })

 
}

suite('Functional Tests', function() {
    
    suite('GET /api/stock-prices => stockData object', function() {
      before(function() {
          dbConnect((col, close) => {
              col.remove({stock: "bbb"});
          })
      })
         /* comment out most tests to allow last tests to run successfully
        (because free tier stock data API allows only 5 calls (i.e stock names) per minute Alpha Vantage)*/
        /*
      test('1 stock', function(done) {
     
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'bbb'})
        .end(function(err, res){
          if(err) console.error(err)
          
          //complete this one too
          //console.log(res.body, res.statusCode);
          
          assert.equal(res.statusCode, 200, "Should have statusCode 200")
          assert.isDefined(res.body, "Body exists");
          assert.property(res.body, "stockData", "res has stockData prop")
          assert.equal(res.body.stockData.stock, "bbb", "should have stock name in response body")
          done();
        });
      });*/
      
      test('1 stock with like', function(done) {
         chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'bbb', like: true})
        .end(function(err, res){
          if(err) console.error(err)
          
          //complete this one too
          
          assert.equal(res.statusCode, 200, "Should have statusCode 200");
          assert.isDefined(res.body, "Body exists");
          assert.property(res.body, "stockData", "res has stockData prop");
          assert.equal(res.body.stockData.stock, "bbb", "should have stock name in response body");
          assert.isAtLeast(res.body.stockData.likes, 1, "Like should be added to stockData")
          done();
        });
      });
      
       test('1 stock with like again (ensure likes arent double counted)', function(done) {
           chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'bbb', like: true})
        .end(function(err, res){
          if(err) console.error(err)
          
          //complete this one too
         
          assert.equal(res.statusCode, 200, "Should have statusCode 200");
          assert.isDefined(res.body, "Body exists");
          assert.property(res.body, "stockData", "res has stockData prop");
          assert.equal(res.body.stockData.stock, "bbb", "should have stock name in response body");
          assert.isAtMost(res.body.stockData.likes, 1, "Like should not  be counted second")
          done();
        });
       });
      
       test('2 stocks', function(done) {
          chai.request(server)
        .get('/api/stock-prices?stock=bbb&stock=goog')
      
        .end(function(err, res){
          if(err) console.error(err)
          
          //complete this one too
          // console.log(res.body, res.statusCode);
          
          assert.equal(res.statusCode, 200, "Should have statusCode 200");
          assert.isDefined(res.body, "Body exists");
          assert.property(res.body, "stockData", "res has stockData prop");
          assert.isArray(res.body.stockData, "Stockdata shoud be array for multiple (2) stock comparison")
          assert.equal(res.body.stockData[0].stock, "bbb", "should have stock name in response body");
          assert.equal(res.body.stockData[1].stock, "goog", "should have second stock name in response body");
          assert.property(res.body.stockData[0], "likes", "Should have rel_like field for 2 stock comparisoon");
          assert.isNumber(res.body.stockData[0].likes, "should be number")
          done();
        });
       });
      
       test('2 stocks with like', function(done) {
           chai.request(server)
        .get('/api/stock-prices?stock=bbb&stock=goog&like=true')
      
        .end(function(err, res){
          if(err) console.error(err)
          
          //complete this one too
          console.log("result at testing for 2 stocks with like\n",res.text,
          res.body, res.statusCode);
          
          assert.equal(res.statusCode, 200, "Should have statusCode 200");
          assert.isDefined(res.body, "Body exists");
          assert.property(res.body, "stockData", "res has stockData prop");
          assert.isArray(res.body.stockData, "Stockdata shoud be array for multiple (2) stock comparison")
          assert.equal(res.body.stockData[0].stock, "bbb", "should have stock name in response body");
          assert.equal(res.body.stockData[1].stock, "goog", "should have second stock name in response body");
          assert.property(res.body.stockData[0], "rel_likes", "Should have rel_like field for 2 stock comparisoon");
          assert.isNumber(res.body.stockData[0].rel_likes)
          done();
        });
       });
      
    });

});
