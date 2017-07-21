var connectdb=require('../model/connectdb.js');
var fs=require('fs');
var csv=require('fast-csv');  //讀CSV
var googl = require('goo.gl');  //縮網址
var moment=require('moment');
var stream = fs.createReadStream("./newShow.csv");
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyC0MEm8jh-8q0hhO_EkzaxS5JdZeOl3pnc'
  // key:'AIzaSyApbStMadpDnaPW1Ms2sZt-Ql9NgSYDxIk'
});
googl.setKey('AIzaSyAgqVuuu5rj_n8-bzgGrH4ErIQoa2QVtZc');
googl.getKey();

var i=0
var csvStream = csv()
    .on("data", async function(data){
      if(i>0){     //(i>0)
        var oneCsvData=await getData(data);
        var location=oneCsvData.location;
        var latlng=await getLatLng(location);
        oneCsvData.latitude=latlng.latitude;
        oneCsvData.longitude=latlng.longitude;
        var longURL=data[8];
        var shortURL=await shorterURL(longURL);
        oneCsvData.webSale=shortURL;
        await insertdata(oneCsvData);   //插入DB
        console.log(typeof oneCsvData,i);
        await fixGroups();
      }
      await i++;
    })
    .on("end", function(){
         console.log("done");
    });

function getFromgoogleForm(){
    stream.pipe(csvStream);
}
// getFromgoogleForm();
// exports.getFromgoogleForm=getFromgoogleForm;

function getData(data){
  return new Promise(function(resolve,reject){
    var temp={
      Title:data[1],
      Auth:data[2],
      // time:data[2],
      price:data[5],
      locationName:data[6],
      onSale:'onsale',
      photo:data[9],
      describe:data[10],
      popular:0
    };
    if(data[7]!==undefined||data[7]!==''||data[7]!==null){
      temp.location=data[7].substring(data[7].indexOf('市')-2,data[7].indexOf('號')+1);
    }
    temp.time=moment(data[3]).format('YYYY/MM/DD')+' '+data[4];
    // console.log(temp);
    resolve(temp);
  });
}

function getLatLng(address){
  if(address!==undefined){
    address=address.substring(address.indexOf('市')-2,address.indexOf('號')+1);
  }
  // console.log(address);
  var latlng={};
  return new Promise(function(resolve,reject){
      googleMapsClient.geocode({
        address:address
      }, function(err,response) {
        if (!err) {
          if(response.json.results[0]===undefined){  //如果找不到該點座標
            latlng.lat='';
            latlng.lng='';
            resolve(latlng);
          }
          else{
            var insertlon=(response.json.results[0].geometry.location.lng).toString();
            var insertlat=(response.json.results[0].geometry.location.lat).toString();
            latlng.longitude=insertlon;
            latlng.latitude=insertlat;
            resolve(latlng);
          }
        }
        else{
          resolve(latlng);
        }
     });
  });
}

function shorterURL(longURL){
  return new Promise(function(resolve,reject){
    googl.shorten(longURL)
    .then(function (shortUrl) {
        // console.log(shortUrl);
        resolve(shortUrl);
    })
    .catch(function (err) {
        console.error(err.message);
    });
  });
}

function insertdata(temp){
    return new Promise(function(resolve,reject){
      var insertStr="insert DELAYED into govmusic set ?";
      connectdb.query(insertStr,temp);
      resolve();
    });
}

async function fixGroups(){
  var newPhotoArr=await getNewGroup();
  await updateGroupsShowId(newPhotoArr)
}
function getNewGroup(){
  return new Promise(function(resolve,reject){
    var newPhotoArr=[];
    var selectStr='select * from groups';
    connectdb.query(selectStr,function(err,rows){
      if(err){
        reject(err);
        return;
      }
      for(var i in rows){
        newPhotoArr.push(rows[i]);
      }
      if(newPhotoArr.length===rows.length){
        // console.log(newPhotoArr);
        resolve(newPhotoArr);
      }
    });
  });
}
function updateGroupsShowId(group){
  // console.log(group);
  return new Promise(function(resolve,reject){
      console.log("starting fixGroups");
      var groupArr=[];
      for(var i in group){
        var temp={
          id:group[i].id,
          photoUrl:group[i].photo
        };
        groupArr.push(temp);
      }
      for(var a in groupArr){
        // console.log(a);
        updateGroupshowid(groupArr[a]);
      }
      resolve();
      function updateGroupshowid(thisGroup){
        // console.log(thisGroup);
        var selectStr='select id from govmusic where photo=?';
        connectdb.query(selectStr,[thisGroup.photoUrl],function(err,rows){
          if(err){
            reject(err);
            return;
          }
          if(rows.length===0){
            reject();
            return;
          }
          var updateStr='update groups set showId=? where id=?';
          var updateValue=[rows[0].id,thisGroup.id];
          connectdb.query(updateStr,updateValue,function(err){
            if(err){
              console.log(err);
            }
          });
        });
      }
    });
}




//-----------------------------------------------
function getGoogleformData(){
  // return new Promise(function(resolve,reject){
    var dataStr=String(fs.readFileSync('../allshow_info3.txt'));  //喔插入資料字串
    console.log('starting insert googleFormData');
    connectdb.query(dataStr,function(err,rows){
      return;
    });
  // });
}
getGoogleformData();
