var connectdb=require('../../model/connectdb.js');
var request=require('request');
var cheerio=require('cheerio');
var fs=require('fs');

async function moreData(){ //the wall music
  try{
    var linkArr=await getAllLink(); //取得所有連結
    // var allShowInfo=[];
    for(var i in linkArr){
      var oneShow=await getPageInfo(linkArr[i]);
      await insertData(oneShow);
      // allShowInfo.push(oneShow);
    }
    console.log('done');
  }catch(err){
    console.log(err);
  }
}
// moreData();
exports.moreData=moreData;

function getAllLink(){
  var url='https://thewall.tw/shows?ground=%E5%85%A8%E9%83%A8&sort=soon';
  var linkArr=[];
  return new Promise(function(resolve,reject){
    request({
       url: url,
       method: "GET"
     },function(err,res,body) {
      $ = cheerio.load(body);
      $('.poster ').each(function(){
        var link='https://thewall.tw'+$(this).attr('href').toString();
        linkArr.push(link);
      });
      resolve(linkArr);
    });
  });
}

function getPageInfo(url){
  return new Promise(function(resolve,reject){
    request({
       url: url,
       method: "GET"
     },function(err,res,body) {
      $ = cheerio.load(body);
      var title=$('.title a').text();
      var date=$('thead tr .date').eq(0).text();
      var time=$('.during .start .date div').text();
      var Auth=$('tbody td ').eq(0).text();
      var photoURL=$('.poster img').attr('src');
      var price=$('.tickets_raw ').eq(0).text();
      var describe=$('.content p').text().replace(/(?:\r\n|\r|\n|\t)/g,'').trim();
      var temp={
        title:title,
        Auth:Auth,
        time:'2017/'+date+' '+time,
        price:price,
        location:'臺灣台北市羅斯福路四段200號B1',
        locationName:'THE Wall 公館',
        latitude:'25.010931',
        longitude:'121.536934',
        onSale:'onsale',
        webSale:url,
        photo:photoURL,
        describe:describe
      };
      resolve(temp);
    });
  });
}

function insertData(thisShow){
  return new Promise(function(resolve,reject){
    var insertStr='insert into govmusic set ?';
    connectdb.query(insertStr,thisShow,function(err,rows){
      if(!err){
        console.log(rows.insertId,':',thisShow.title);
        resolve();
      }else{
        resolve();
      }
    });
  });
}
