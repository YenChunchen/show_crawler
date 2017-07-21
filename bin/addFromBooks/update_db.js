var connectdb=require('../../model/connectdb.js');
var fs = require("fs");
var async=require('async');
var request=require('request');
var headers = {
  "accept-language":"zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4",
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
};
var removeOverTime=require('../removeOverTime');
var getOtherInfo=require('../addFromTheWall/getOtherInfo');

async function updateDb(data){
  console.log('updating table');
  // connectdb.query('TRUNCATE TABLE govmusic');  //重整自動增長id
  await insertData(data);
  await getOtherInfo.moreData();
  await removeTest();
  await fixAddress();
  // await removeGroupOverTime();
  await fixGroups();
  // removeOverTime.removeOverTime();
  console.log('done');
}

exports.updateDb=updateDb;
//將最新所需值更新DB
async function insertData(data){
    console.log('starting insertData');
    for(var i in data){
      var temp={
        Title:data[i].Title,
        Auth:data[i].Auth,
        time:data[i].time,
        price:data[i].price,
        locationName:data[i].locationName,
        location:data[i].location,
        latitude:data[i].latitude,
        longitude:data[i].longitude,
        onSale:data[i].onSale,
        webSale:data[i].webSale,
        photo:data[i].photo,
        describe:data[i].describe,
        popular:0
      };
      if(temp.time.indexOf('/')===-1){
        continue;
      }
      await insert(temp);
    }
    function insert(temp){
      return new Promise(function(resolve,reject){
        connectdb.query('insert into govmusic set ?',[temp],function(err,rows){
          if(err){
            console.log(err);
            return;
          }
          resolve();
        });
      });
    }
}

function removeTest(){
  return new Promise(function (resolve,reject){
    console.log('starting removeTest');
    connectdb.query("select * from govmusic where Title LIKE '%Test%' OR Title LIKE '%測試%'",function(err,rows){
      if(err){
        console.log(err);
        return;
      }
      for(var i in rows){
        // console.log(rows[i].Title,rows[i].id);
        connectdb.query('delete from govmusic where id=?',[rows[i].id]);
      }
      console.log(2);
      resolve();
    });
  });
}

function fixAddress(){  //經緯度補地址
  console.log('starting fixAddress');
  var emptyId=[],count=0;
  connectdb.query('select * from govmusic',function(err,rows){
    if(err){
      console.log(err);
      return;
    }
    for(var i in rows){
      if(rows[i].location===''){
        emptyId.push(rows[i].id);
        request({
          headers: headers,
          url:'https://maps.googleapis.com/maps/api/geocode/json?latlng='+rows[i].latitude+','+rows[i].longitude+'&key=AIzaSyApbStMadpDnaPW1Ms2sZt-Ql9NgSYDxIk'
        },function(err,body){
          var htmlToJson=JSON.parse(body.body);
          if(htmlToJson.results[0]===undefined){
            address=''
            // fixAddress();
            return;
          }
          var address=htmlToJson.results[0].formatted_address.substring(5);
          console.log('+++',address,i,emptyId);
          var updateStr='update govmusic set location=? where id=?';
          var updateValue=[address,emptyId[count++]];
          connectdb.query(updateStr,updateValue);
        });
      }
    }
  });
}


async function removeGroupOverTime(){ //99 117 102 98 21
  console.log("starting removeGroupOverTime");
  var photoUrlArr=await findPhotoURLFromGroup();
  // console.log(photoUrlArr);
  var removeArr=[];
  for(var i in photoUrlArr){
    var temp=await deleteOverTimeGroups(photoUrlArr[i].photo,photoUrlArr[i].groupId);
    if(temp!==undefined){
      removeArr.push(temp);
    }
  }
  // console.log(removeArr);
  for(var x in removeArr){
    await updateHost(removeArr[x].removeHostId,removeArr[x].removeId);
  }
  for(var y in removeArr){
    await updateCustomer(removeArr[y].removeCustomerId,removeArr[y].removeId);
  }
  for(var z in removeArr){
    // console.log('YYEESS',removeArr[z].removeId);
    var deleteGroup='delete from groups where id='+removeArr[z].removeId.toString();
    var deleteCahtRoom='delete from chatroom where groupId='+removeArr[z].removeId.toString();
    connectdb.query(deleteCahtRoom); //刪除聊天室訊習
    connectdb.query(deleteGroup); //刪除該揪團
  }
}
function findPhotoURLFromGroup(){
  return new Promise(function(resolve,reject){
    var selectStr='select * from groups order by id';
    var photoUrlArr=[];
    connectdb.query(selectStr,function(err,rows){
      if(err){
        reject(err);
        return;
      }
      if(rows.length===0){
        resolve();
        return;
      }
      for(var i in rows){
        var temp={
          groupId:rows[i].id,
          photo:rows[i].photo
        };
        photoUrlArr.push(temp);
      }
      resolve(photoUrlArr);
    });
  });
}
function deleteOverTimeGroups(photoUrl,id){
  // console.log(photoUrl,id);
  return new Promise(function(resolve,reject){
    var selectStr='select * from govmusic where photo='+"'"+photoUrl+"'";
    connectdb.query(selectStr,function(err,rows){
      // console.log(rows);
      if(rows.length===0){
        // console.log(photoUrl);
        // resolve();
        var selStr='select * from groups where photo=? and id=?';
        var selVal=[photoUrl,id];
        connectdb.query(selStr,selVal,function(err,rows){
          var remove={
            removeId:rows[0].id,
            removeHostId:rows[0].hostId,
            removeCustomerId:rows[0].customerId
          };
          resolve(remove);
        });
      }else{
        resolve();
      }
    });
  });
}
function updateHost(hostId,groupId){
  return new Promise(function(resolve,reject){
    var selectStr='select * from member where id=?';
    connectdb.query(selectStr,[hostId],function(err,rows){
      // console.log('member:',rows[0].id,rows[0].createGroup);
      if(rows[0].createGroup===null){
        resolve();
        return;
      }
      var createdGroupArr=rows[0].createGroup.split(',');
      // console.log(createdGroupArr);
      var index =createdGroupArr.indexOf(groupId.toString());
      /*更新新的createdGroup*/
      if (index > -1) {
        createdGroupArr.splice(index, 1);
      }
      // console.log('new createGroup',createdGroupArr.join(','));
      var newCreateGroup=createdGroupArr.join(',');
      if(newCreateGroup===''){
        newCreateGroup=null;
      }
      connectdb.query('update member set createGroup=? where id=?',[newCreateGroup,hostId],function(err){
        if(!err){
          resolve();
        }
      });
    });
  });
}
async function updateCustomer(customerId,groupId){
  return new Promise(function(resolve,reject){
    console.log('customerId:',customerId);
    console.log('groupId:',groupId);
    if(customerId===''||customerId===null||customerId===' '){
      resolve();
    }
    var customerIdArr=customerId.split(',');  //***********
    // console.log(customerIdArr);
    for(var i in customerIdArr){
      // console.log(i,customerIdArr[i]);
      var thisMemberId=customerIdArr[i];
      removeJoinGroup(thisMemberId);
    }
    resolve();
    function removeJoinGroup(thisMemberId){
      var selectStr='select * from member where id =?';
      return new Promise(function(resolve,reject){
        connectdb.query(selectStr,[thisMemberId],function(err,rows){
          // console.log(rows[0].id,':',rows[0].joinGroup,groupId);
          if(rows[0].joinGroup===null||rows[0].joinGroup===''|rows[0].joinGroup===' '){
            return;
          }
          var joinGroupArr=rows[0].joinGroup.split(',');
          if(joinGroupArr[0].length===0){
            joinGroupArr.shift();
          }
          var index =joinGroupArr.indexOf(groupId.toString());
          if (index > -1) {
            joinGroupArr.splice(index, 1);
          }
          var newCreateGroup=joinGroupArr.join(',');
          if(newCreateGroup===''||newCreateGroup===' '){
            newCreateGroup=null;
          }
          // console.log('=====',newCreateGroup);
          connectdb.query('update member set joinGroup=? where id=?',[newCreateGroup,thisMemberId],function(err){
            if(!err){
              resolve();
            }
          });
        });
      });
    }
  });
}
// function removeGroup(groupId){
//   return new Promise(function(resolve,reject){
//     var deleteStr='delete from groups where id='+groupId.toString();
//     console.log(deleteStr);
//     connectdb.query(deleteStr,function(err,rows){
//       // if(!err){
//         resolve();
//       // }
//     });
//   });
// }











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
              console.log('111111111111111111111111',err);
            }
          });
        });
      }
    });
}

// await function(group){
//   return new Promise(function(resolve,reject){
//     console.log("starting fixGroups");
//     var groupArr=[];
//     for(var i in group){
//       console.log('=====',group[i].id);
//       var temp={
//         id:group[i].id,
//         photoUrl:group[i].photo
//       };
//       groupArr.push(temp);
//     }
//     // console.log(groupArr);
//     for(var a in groupArr){
//       updateGroupshowid(groupArr[a]);
//     }
//     resolve();
//     function updateGroupshowid(thisGroup){
//       console.log(thisGroup);
//       var selectStr='select id from govmusic where photo=?';
//       connectdb.query(selectStr,[thisGroup.photoUrl],function(err,rows){
//         console.log('+++++',rows[0].id );
//         if(err){
//           reject(err);
//           return;
//         }
//         var updateStr='update groups set showId=? where id=?';
//         var updateValue=[rows[0].id,thisGroup.id];
//         connectdb.query(updateStr,updateValue,function(err){
//           if(err){
//             console.log('111111111111111111111111',err);
//           }
//         });
//       });
//     }
//   });
//   }
// }
