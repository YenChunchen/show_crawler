var connectdb=require('../model/connectdb.js');
var fs = require("fs");
var async=require('async');
var getAllLinkFromBooks = require('./addFromBooks/getAllLinkFromBooks');  //一次更新

exports.insertData=async function(data){
  console.log('updating table');
  // console.log(data);
  await updateTable();
  await insertData(data);
  await fixGroups();
  await getGoogleformData();
  await removeOverTimeShow();
  getAllLinkFromBooks.downloadFromBooks();  //一次更新
};

function getGoogleformData(){
  return new Promise(function(resolve,reject){
    var dataStr=String(fs.readFileSync('./allshow_info3.txt'));  //喔插入資料字串
    console.log('starting insert googleFormData');
    connectdb.query(dataStr,function(err,rows){
      resolve();
    });
  });
}


function removeOverTimeShow(){
  var date=new Date();
  var today=date.getFullYear().toString()+'-'+(date.getMonth()+1).toString()+'-'+date.getDate().toString();
  // console.log('today',today);
  var todayTime=new Date(today).getTime();
  // console.log('todayTime',todayTime)
  return new Promise(function(resolve,reject){
    connectdb.query('select * from govmusic',function(err,rows){
      if(err){
        reject(err);
        return;
      }else{
        for(var i in rows){
          var showDate=rows[i].time.substring(0,10);
          // console.log('showDate',showDate);
          var showTime=new Date(showDate).getTime();
          // console.log('showTime',showTime);
          if(showTime<todayTime){
            connectdb.query('delete from govmusic where id=?',[rows[i].id]);
          }
        }
        resolve();
      }
    });
  });
}


function updateTable(){
  return new Promise(function(resolve,reject){
    connectdb.query('select * from govmusic',function(err,rows ){
      console.log(rows.length);
      if(rows.length!==0){
        connectdb.query('delete from govmusic where id between 1 and '+rows[rows.length-1].id);
        connectdb.query('TRUNCATE TABLE govmusic');  //重整自動增長id
        resolve();
        // insertData(data);
      }
      else{
        connectdb.query('TRUNCATE TABLE govmusic');  //重整自動增長id
        resolve();
        // insertData(data);
      }
    });
  });
}

//將最新所需值更新DB
function insertData(data){
  return new Promise(function(resolve,reject){
    var temp={};
    for(var i in data){
      // console.log(data[i].time.substring(0,10));
      // console.log(data[i].time.substring(14,19));
      // var time={
      //   date:data[i].time.substring(0,10),
      //   startTime:data[i].time.substring(14,19)
      // };
      temp={
        Title:data[i].Title,
        Auth:data[i].Auth,
        time:data[i].time,
        price:data[i].price,
        locationName:data[i].locationName,
        location:data[i].location,
        latitude:data[i].latitude,
        longitude:data[i].longitude,
        onSale:data[i].isSale,
        webSale:data[i].webSale,
        photo:data[i].pic,
        describe:data[i].describe,
        popular:0
      };
      connectdb.query('insert into govmusic set ?',temp,function(err,rows){
        resolve();
      });
    }
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
        updateGroupshowid(groupArr[a]);
      }
      resolve();
      function updateGroupshowid(thisGroup){
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
