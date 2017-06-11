var express = require('express');
var router = express.Router();
var db = require('../DBUtils');

var Connection = require('tedious').Connection;

var config = {
    userName: 'alusha',
    password: 'echc88Wn',
    server: 'avivserver.database.windows.net',
    requestTimeout: 30000,
    options: {encrypt: true, database: 'avivDB'}
};

// connect to azure
var connection = new Connection(config)
var connected = false;
connection.on('connect', function(err) {
    if (err) {
        console.error('error connecting; ' + err.stack);
        return;
    }
    console.log("connected Azure");
    connected=true;
});

router.post('/Login', function(req,res){
    var name = req.body.User_name;
    var password = req.body.User_password;
    var date=req.body.dateNow;
    db.Select(connection,"Select User_name,User_password from Users_tbl where User_name='"+name+"' and User_password='"+password+"'",function (ans) {
        if(ans.length==1)
        {
            db.Insert("UPDATE Users_tbl SET lastDate = '"+date+"' where User_name='"+name+"'", config);

            res.send(true);
        }
        else
        {
            res.send(false);
        }

    });


});

router.post('/Register', function(req,res){
    var name = req.body.User_name;
    var firstname = req.body.User_firstname;
    var lastname = req.body.User_lastname;
    var email = req.body.User_email;
    var adress = req.body.User_adress;
    var password = req.body.User_password;
    var country = req.body.User_country;
    var reqans1 = req.body.User_reqans1;
    var reqans2 = req.body.User_reqans2;
    var Favoritecategories = req.body.User_Favoritecategories;
    db.Select(connection,"Select User_name from Users_tbl where User_name='"+name+"'",function (ans) {
        if(ans.length==1)
        {
            console.log("User exist");
            res.send(false);

        }
        else
        {
            db.Insert("INSERT INTO Users_tbl" + "(User_name, User_firstname, User_lastname, User_email, User_adress, User_password, User_country, User_reqans1, User_reqans2)" + "VALUES ('" + name + "', '"+ firstname + "', '"+ lastname + "', '"+ email + "', '"+ adress + "', '"+ password + "', '"+ country + "', '"+ reqans1 + "', '"+ reqans2 + "');",config);
            for (var i=0;i<Favoritecategories.length;i++)
            {
                db.Insert("INSERT INTO User_cat"+"(User_name, Category_name) VALUES ('"+name+"','"+Favoritecategories[i]+"');", config);
            }
            res.send(true);
        }

    });




});


router.get('/getItemList', function(req,res){
    var query="select * from Items_tbl"
    db.Select(connection,query, function (ans) {
        res.send(ans);
    });
});

router.post('/getUserDetails', function(req,res){
    var name = req.body.User_name;
    var query="select * from Users_tbl where User_name='" + name+"';";
    db.Select(connection,query, function (ans) {
        res.send(ans);
    });
});

router.post('/PasswordRec', function(req,res){
    var name = req.body.User_name;
    var ans1=req.body.User_reqans1;
    var ans2=req.body.User_reqans2;
    var query="select * from Users_tbl where User_name='" + name+"';";
    db.Select(connection,query, function (ans) {
      if(ans.length==1){
          var query1="select User_password from Users_tbl where User_name='" + name+"' AND User_reqans1='" + ans1+"' AND User_reqans2='" + ans2+"';" ;
          db.Select(connection,query1, function (ans1) {
              if(ans1.length==1){
                  res.send(ans1[0].User_password);
              }
              else{

                  res.send("One of the answers is incorrect");
                  res.send(ans1);
              }

          });


      }
      else{
          res.send("User does not exist");
      }

    });
});

router.get('/getNewItems', function(req,res){
    var now=new Date();
    var dayNow;
    var monthNow
    var yearNow
    now.setDate(now.getDate());
    now.setMonth(now.getMonth());
    monthNow=now.getMonth()+1;
    dayNow=now.getDate();
    yearNow=now.getFullYear();

    if(monthNow==1){
        monthNow=12;
        yearNow=now.getFullYear()-1;
    }
    else{
        monthNow=monthNow-1;
    }
    if(monthNow<10)
        monthNow="0"+monthNow;
    if(dayNow<10)
        dayNow="0"+dayNow;
    var dateNow=yearNow+"-"+monthNow+"-"+dayNow;

    db.Select(connection, "select Item_name,Item_price,Item_Category,Item_stock,datePublish,Item_artist,buyAmount from Items_tbl where datePublish>='"+dateNow+"'", function (ans) {
        res.send(ans);
    });


});

router.get('/getTop5sellersWeek', function(req,res){
    var now=new Date();
    var dayNow;
    var monthNow
    var yearNow
    now.setDate(now.getDate());
    now.setMonth(now.getMonth());
    monthNow=now.getMonth()+1;
    dayNow=now.getDate();
    yearNow=now.getFullYear();

    if(dayNow<8 && monthNow==1){
        dayNow=dayNow+30-7;
        monthNow=12;
        yearNow=now.getFullYear()-1;
    }
    else if(dayNow<8){
        dayNow=dayNow+30-7;
        monthNow=monthNow-1;
    }
    else{
        dayNow=dayNow-7;
    }
    if(monthNow<10)
        monthNow="0"+monthNow;
    if(dayNow<10)
        dayNow="0"+dayNow;
    var dateNow=yearNow+"-"+monthNow+"-"+dayNow;
    var query="SELECT top (5) Item_id FROM Order_history WHERE DateOrder>'"+dateNow+"' group by Item_id ORDER BY Sum(itamOrderAmount) DESC"

    db.Select(connection,query, function (ans) {
      if(ans.length==5){
          var query1="select * from Items_tbl where Item_id='"+ans[0].Item_id+"' or Item_id='"+ans[1].Item_id+"' or Item_id='"+ans[2].Item_id+"' or Item_id='"+ans[3].Item_id+"' or Item_id='"+ans[4].Item_id+"'";
          db.Select(connection,query1, function (ans1) {
              res.send(ans1);
          });

      }
      else{
          res.send(false);
      }


    });



});

router.post('/buy', function(req,res){
    var staticIDorder;
    db.Select(connection,"Select TOP (1) Order_id from Order_history order by Order_id desc", function (ans) {
        if(ans.length==1){
            staticIDorder=(ans[0].Order_id)+1;
            var listItem = req.body.listItem;
            var name = req.body.User_name;
            var dateShip = req.body.dateShip;
            var currency = req.body.currency;
            var DateOrder = req.body.DateOrder;
            for (var i=0;i<listItem.length;i++)
            {

                db.Insert("Update  Items_tbl set Item_stock=Item_stock-"+listItem[i].stock+" ,buyAmount=buyAmount+"+listItem[i].stock+" where item_id='"+listItem[i].id+"';", config);
                db.Insert("INSERT INTO Order_history "+"(User_name,Item_id,Order_id,Item_price,DateOrder, itamOrderAmount,dateShip,currency) VALUES ('"+name+"','"+listItem[i].id+"','"+staticIDorder+"','"+listItem[i].price+"','"+DateOrder+"','"+listItem[i].stock+"','"+dateShip+"','"+currency+"');", config);

            }
            res.send(true);
        }
        else{

            res.send(false);
        }

    });



});

router.get('/isInStock', function(req,res){
    var id=req.param("Item_id");
    var stock=req.param("Item_stock");
    db.Select(connection, "select Item_stock from Items_tbl where Item_id='"+id+"'", function (ans) {
      if((ans[0].Item_stock-stock)>0){
          res.send(true);
      }
      else{
          res.send(ans);
      }

    });
});


router.get('/previousUserOrders', function(req,res){
    var name=req.param("User_name");
    var query="SELECT Order_id,sum(itamOrderAmount) as totalAmount,sum(Item_price) as totalPrice,DateOrder,dateShip,currency FROM Order_history WHERE User_name='"+name+"' group by Order_id,DateOrder,dateShip,currency ORDER BY Sum(itamOrderAmount) DESC";

    db.Select(connection, query, function (ans) {
        if(ans.length>0){
            res.send(ans);
        }
        else{
            res.send("There are no orders you have");
        }

    });
});


router.get('/orderDetails', function(req,res){
    var id=req.param("Order_id");
    var query="SELECT Item_id,DateOrder,dateShip,currency,itamOrderAmount,Item_price FROM Order_history WHERE Order_id='"+id+"' group by Item_id,DateOrder,dateShip,currency,itamOrderAmount,Item_price";

    db.Select(connection, query, function (ans) {
        if(ans.length>0){
            console.log(ans);
            var query1="select Item_name from Order_history join Items_tbl on Order_history.Item_id = Items_tbl.Item_id where Order_id ='"+id+"'";
            db.Select(connection, query1, function (ans1) {
                if(ans1.length>0){
                  var tempList=[];
                    for (var i=0;i<ans1.length;i++)
                    {
                        var temp= {
                            "Item_name": ans1[i].Item_name,
                            "Item_price": ans[i].Item_price,
                            "itamOrderAmount": ans[i].itamOrderAmount,
                            "currency": ans[i].currency,
                        }
                        tempList[i]=temp;
                    }

                    var returnOrderDetails= {
                        "Order_id":id,
                        "DateOrder":ans[0].DateOrder,
                        "dateShip":ans[0].dateShip,
                        "listItem":[tempList]
                    };
                    res.send(returnOrderDetails);
                }
                else{
                    res.send(false);
                }

            });



        }
        else{
            res.send(false);
        }


    });
});

router.post('/getRecommendation', function (req, res){
    var name = req.body.User_name;
    var query = "select  *  from User_cat join Items_tbl on  User_cat.Category_name=Items_tbl.Item_Category where  User_name = '" + name + "' AND buyAmount > (select AVG (buyAmount) from User_cat join Items_tbl on  User_cat.Category_name=Items_tbl.Item_Category where  User_name = '"+name+"');";
    db.Select(connection, query, function (ans){
        res.send(ans);
    });
});

router.get('/getItemSortByArtistName', function (req,res) {
    var artistname = req.param("Item_artist");
    var sortBy = req.param("Item_order");
    db.Select(connection, "select * from Items_tbl where Item_artist='" + artistname + "' order by'" +sortBy+"'", function (ans) {
        res.send(ans);
    });
});

router.get('/getItemSortByCategory', function (req,res) {
    var cat = req.param("Item_Category");
    var sortBy = req.param("Item_order");
    db.Select(connection, "select * from Items_tbl where Item_Category='" + cat + "' order by'" +sortBy+"'", function (ans) {
        res.send(ans);
    });
});

router.get('/getItemSortByPrice', function (req,res) {
    var price = req.param("Item_price");
    var sortBy = req.param("Item_order");
    db.Select(connection, "select * from Items_tbl where Item_price<='" + price + "' order by'" +sortBy+"'", function (ans) {
        res.send(ans);
    });
});

router.get('/getItemSortByCategoryandPrice', function (req,res) {
    var cat = req.param("Item_Category");
    var price = req.param("Item_price");
    db.Select(connection, "select * from Items_tbl where Item_Category='" + cat + "' AND Item_price<='"+price +"'", function (ans) {
        res.send(ans);
    });
});

router.get('/getItemSortByArtistandPrice', function (req,res) {
    var artistname = req.param("Item_artist");
    var price = req.param("Item_price");
    db.Select(connection, "select * from Items_tbl where Item_artist='" + artistname + "' AND Item_price<='"+price +"'", function (ans) {
        res.send(ans);
    });
});

router.get('/getCategoryList',function(req,res){
    var query = "select * from Category_tbl";
    db.Select(connection,query, function (ans){
        res.send(ans);
    });
});

router.post('/getItemDetails', function(req,res){
    var item_id = req.body.item_id;
    var query = "select * from Items_tbl where Item_id='" + item_id + "';";
    db.Select(connection,query, function (ans){
        res.send(ans);
    });
});


router.post('/getItemByName', function (req,res){
    var name = req.body.Item_name;
    var query = "select * from Items_tbl where Item_name='" + name + "' or Item_artist='"+name+"'";
    db.Select(connection,query, function (ans){
      if(ans.length>0){
          res.send(ans);
      }
      else{
          res.send("name is not find");
      }

    });
});



module.exports = router;