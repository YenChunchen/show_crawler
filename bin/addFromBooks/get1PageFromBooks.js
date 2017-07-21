var cheerio=require('cheerio');
var request=require('request');
var iconv = require('iconv-lite');  //解碼模組
var headers = {
  "accept-language":"zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4",
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
};
var googleMapsClient = require('@google/maps').createClient({
  // key: 'AIzaSyApbStMadpDnaPW1Ms2sZt-Ql9NgSYDxIk'
  key:'AIzaSyC0MEm8jh-8q0hhO_EkzaxS5JdZeOl3pnc'
});
var geocoder = require('geocoder');
var async=require('async');
var fs=require('fs');
var updateDb=require('./update_db');
var allShowInfo=[];
async function getOnePageInfoFromBooks(url,max){
  var pageData=await getPage(url);  //取得頁面資訊
  // console.log(pageData);
  if(pageData===undefined){
    pageData={Title:"test",Auth:"",time:"",location:"",locationName:"",price:"",webSale:"",photo:"",isSale:"",onsale:"",describe:""}
  }
  var thisShowLonLat=await getLonLat(pageData);  //補經緯度
  var thisShowAddress=await getAddress(thisShowLonLat); //補地址
  var thisShow=JSON.stringify(thisShowAddress); //轉成JSON字串
  // console.log('===',thisShow);
  allShowInfo.push(thisShow);
  // console.log(url,allShowInfo.length,max);
  if(allShowInfo.length===max){
    fs.writeFile("allshow_info2.txt","["+allShowInfo+"]", function(err) {
     console.log('finish writing');
     if(err) {
        console.log(err);
        return;
     } else {
       var data=JSON.parse(fs.readFileSync('allshow_info2.txt'));
       console.log("The file "+(data.length).toString()+" was saved!");  //寫入DB
       console.log(123);
       updateDb.updateDb(data);
      }
    });
  }

}
exports.get1PageFromBooks=getOnePageInfoFromBooks;

function getPage(url){
  console.log(url);
  return new Promise(function(resolve,reject){
    request({
       url: url,//你想抓的網址
       headers: headers,
       encoding: null  //禁止使用預設編碼
     },function(err,res,body) {
       var str = iconv.decode(body, "big5");   //將編碼解碼成big5
       $ = cheerio.load(str);
       var showInfo={};
       showInfo.Title=$('meta[property="og:title"]').attr('content');
         //取得header>meta property="og:title" content值      //Title
       var timeLocationPriceAuth=[];
       $('.prd002 li dfn').each(function(){
         var temp = $(this).text().toString().replace(/(?:\r\n|\r|\n|\t)/g, '').trim();
         timeLocationPriceAuth.push(temp);
       });
       showInfo.Auth=timeLocationPriceAuth[6]; //Auth
       showInfo.time=timeLocationPriceAuth[1]; //time
       showInfo.locationName=timeLocationPriceAuth[2]; //locationName
       showInfo.photo=$('#progmedia-pic').attr('src');  //photo
       showInfo.onSale=$('.prf001 button span').text().toString().trim(); //onSale
       if(showInfo.onSale==='已售完'){
         showInfo.onSale='soldout';
       }
       if(showInfo.onSale==='購票去'){
         showInfo.onSale='onsale';
       }
       if(showInfo.onSale==='未開放訂購'){
         showInfo.onSale="can't order now";
       }
       showInfo.webSale=$('meta[property="og:url"]').attr('content');//webSale
      if(timeLocationPriceAuth.length===0){
        resolve();
        return;
      }else{
        showInfo.price=timeLocationPriceAuth[3].substring(0,12);
      }
       $('.ttl h2 span').each(function(){
         if($(this).text()==='節目介紹'){
           showInfo.describe=$('.spr01').first().text().trim().replace(/(?:\r\n|\r|\n|\t)/g, '');
         }
       });
       resolve(showInfo);
     });
  });
}

function getLonLat(showInfo){
  return new Promise(function(resolve,reject){
    // console.log(showInfo.locationName);
    googleMapsClient.geocode({
      address:showInfo.locationName
    }, function(err,response) {
      // console.log(response.json.results[0]);
      if (!err) {
        if(response.json.results[0]===undefined){  //如果找不到該點座標
          showInfo.longitude='';
          showInfo.latitude='';
          resolve(showInfo);
        }
        else{
          var insertlon=(response.json.results[0].geometry.location.lng).toString();
          var insertlat=(response.json.results[0].geometry.location.lat).toString();
          showInfo.longitude=insertlon;
          showInfo.latitude=insertlat;
          resolve(showInfo);
        }
      }
      else{
        resolve(showInfo);
      }
    });
  });
}
function getAddress(showInfo){
  return new Promise(function(resolve,reject){
      request({
        headers: headers,
        url:'https://maps.googleapis.com/maps/api/geocode/json?latlng='+showInfo.latitude+','+showInfo.longitude+'&key=AIzaSyApbStMadpDnaPW1Ms2sZt-Ql9NgSYDxIk'
      },function(err,body){
        var htmlToJson=JSON.parse(body.body);
        if(htmlToJson.status==='INVALID_REQUEST'){
          showInfo.location='';
          resolve(showInfo);
          return;
        }
        if(htmlToJson.results[0]===undefined||htmlToJson.results[0]){
          showInfo.location='';
          resolve(showInfo);
        }
        showInfo.location=htmlToJson.results[0].formatted_address.substring(5);
        resolve(showInfo);
      });
  });
}



//AIzaSyApbStMadpDnaPW1Ms2sZt-Ql9NgSYDxIk
//AIzaSyC0MEm8jh-8q0hhO_EkzaxS5JdZeOl3pnc
