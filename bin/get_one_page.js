var request = require('request');
var cheerio = require("cheerio");
var async=require('async');
var fs=require('fs');
var insertData=require('./update_db');
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyC0MEm8jh-8q0hhO_EkzaxS5JdZeOl3pnc'
  // key:'AIzaSyApbStMadpDnaPW1Ms2sZt-Ql9NgSYDxIk'
});
var arr=[];
async function getShowInfo(address,max){
  var urlcallback=address;
  var pageData=await getPageData(address);  //取得頁面資訊
  var thisShowTemp=await getLatLon(pageData);  //google補經緯度
  var thisShow=JSON.stringify(thisShowTemp);  //轉JSON字串
  arr.push(thisShow);
  if(arr.length===max){  //判斷為最後一筆資料
    fs.writeFile("allshow_info.txt","["+arr+"]", function(err) {
      console.log('finish writing');
     if(err) {
        console.log(err);
        return;
     } else {
       var data=JSON.parse(fs.readFileSync('allshow_info.txt'));
       console.log("The file "+(data.length).toString()+" was saved!");  //寫入DB
       insertData.insertData(data);
      }
    });
  }
  // console.log(thisShow);
}
exports.getShowInfo=getShowInfo;

function getPageData(address){
  var temp;
  return new Promise(function(resolve,reject){
    request({
       url: address,//你想抓的網址
       method: "GET"
     },function(err,res,body) { /* Callback 函式 */
      $ = cheerio.load(body);
       var thisShowInfo=[],thisShowPic;
       thisShowInfo.push($('h1').text().trim().split('/n'));
       $('.m-bottom-2').each(function(){    //取得該區欲元素
         thisShowPic=($('.post-img').attr('src'));//將內容依序加入陣列
       });
       $('.table-nobordered tbody td').each(function(){    //取得該區欲元素
         thisShowInfo.push($(this).text().trim());//將內容依序加入陣列
       });
       thisShowInfo.push($('h1').text().trim());
       thisShowInfo.push($('.event-data button').text().trim());
       if(thisShowInfo[9]==='售完'){
         thisShowInfo[9]='soldout';
       }
       else{
         thisShowInfo[9]='onsale';
       }
       var describeArr=($('.profile-content .col-lg-8 p ').text().trim().split('\n'));
       var describe;
       if(describeArr[0].toString().indexOf("＊")!==(-1)){
         describe=describeArr[0].toString().substring(0,describeArr[0].toString().indexOf("＊")).trim();
       }else{
         describe=describeArr[0].toString();
       }
       temp={
         Title:thisShowInfo[0].toString(),
         Auth:thisShowInfo[3],
         time:thisShowInfo[2],
         location:thisShowInfo[6],
         locationName:thisShowInfo[5],
         price:thisShowInfo[1],
         webSale:address,
         pic:thisShowPic,
         isSale:thisShowInfo[9],
         describe:describe
       };
       resolve(temp);
     });
  });
}

function getLatLon(temp){
  return new Promise(function(resolve,reject){
    if((temp.location==='')&&(temp.locationName==='')){//判斷演出地址和地點是否為空
      temp.longitude=null;
      temp.latitude=null;
      resolve(temp);
    }
    else{
      console.log('====',temp.location);
      var address=temp.location.substring(0,temp.location.indexOf("號")+1);  //取得地址至XX號
      if(address===''){ //如果沒有演出地址用地點查詢
        address=temp.locationName;
      }
      googleMapsClient.geocode({
        address:address
      }, function(err,response) {
        if (!err) {
          if(response.json.results[0]===undefined){  //如果找不到該點座標
            temp.longitude=null;
            temp.latitude=null;
            resolve(temp);
          }
          else{
            var insertlon=(response.json.results[0].geometry.location.lng).toString();
            var insertlat=(response.json.results[0].geometry.location.lat).toString();
            temp.longitude=insertlon;
            temp.latitude=insertlat;
            resolve(temp);
          }
        }
        else{
          resolve(temp);
        }
     });
    }
  });
}





    //  async.waterfall([
    //    findLonLat
    //  ],async function(err,result){
    //    var tempstr=JSON.stringify(temp);
    //    arr.push(tempstr);
    //   //  console.log(arr.length);
    //    if(arr.length===max){
    //      fs.writeFile("allshow_info.txt","["+arr+"]", function(err) {
    //        console.log('finish writing');
    //       if(err) {
    //          console.log(err);
    //          return;
    //       } else {
    //         var data=JSON.parse(fs.readFileSync('allshow_info.txt'));
    //         console.log("The file "+(data.length).toString()+" was saved!");  //寫入DB
    //         await insertData.insertData(data);
    //        }
    //      });
    //    }
    //  });
    //  function findLonLat(Callback){  //查詢該地址經緯度
    //   if((temp.location==='')&&(temp.locationName==='')){//判斷演出地址和地點是否為空
    //     temp.longitude='';
    //     temp.latitude='';
    //     Callback(null);
    //   }
    //   else{
    //     console.log('====',temp.location);
    //     var address=temp.location.substring(0,temp.location.indexOf("號")+1);  //取得地址至XX號
    //     if(address===''){ //如果沒有演出地址用地點查詢
    //       address=temp.locationName;
    //     }
    //     googleMapsClient.geocode({
    //       address:address
    //     }, function(err,response) {
    //       if (!err) {
    //         if(response.json.results[0]===undefined){  //如果找不到該點座標
    //           temp.longitude='';
    //           temp.latitude='';
    //           Callback(null);
    //         }
    //         else{
    //           var insertlon=(response.json.results[0].geometry.location.lng).toString();
    //           var insertlat=(response.json.results[0].geometry.location.lat).toString();
    //           temp.longitude=insertlon;
    //           temp.latitude=insertlat;
    //           Callback(null);
    //         }
    //       }
    //       else{
    //         Callback(null);
    //       }
    //    });
    //   }
    //  }
