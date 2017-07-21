var cheerio=require('cheerio');
var request=require('request');
var iconv = require('iconv-lite');  //解碼模組
var headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
};
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyC0MEm8jh-8q0hhO_EkzaxS5JdZeOl3pnc'
});
var async=require('async');
var get1PageFromBooks=require('./get1PageFromBooks');

exports.downloadFromBooks=function(){
  getAllLinkFromBooks();
};


function getAllLinkFromBooks(){
  request({
     url: 'http://tickets.books.com.tw/concert/',//你想抓的網址
     method: "GET"
   },async function(err,res,body) { /* Callback 函式 */
    $ = cheerio.load(body);
     var showLink=[];
     $('.list a').each(function(){    //取得該區域中元素
       var link = $(this).attr('href').toString();  //取得超連結地址
       showLink.push(link);  //依序將地址存入陣列
     });
    console.log('getAllLinkFromBooks');
    for(var i in showLink){
      // console.log(showLink[i],i);
      var max=showLink.length;
      await get1PageFromBooks.get1PageFromBooks(showLink[i],max);
    }
   });
}
// getAllLinkFromBooks();
