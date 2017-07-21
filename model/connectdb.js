var mysql = new require("mysql");
// exports.con=function(){  //連線 function
var mydb  = mysql.createConnection({
    host: "",
    user: "",
    password: "",
    database: "" //rds name
  });
module.exports = mydb;
