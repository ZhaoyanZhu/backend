const express=require("express");
const app=express();
const cors=require("cors");
const pool=require("./db");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req,res)=>{
    res.json('Welcome to the server')
})

app.get("/display_user_info", async(req,res)=>{
    const {user_name}=req.body;
    try{
        const result=await pool.query("SELECT user_name,first_name,last_name,email,phone,credit FROM user WHERE user_name=$1",[user_name]);
        res.json(result.rows[0]);

    } catch(err){
        console.error(err.message);
    }
});

app.get("/display_purchase_history",async(req,res)=>{
    const {user_name}=req.body;
    try{
        const purchase_history=await pool.query("SELECT * FROM order WHERE buyer=$1",[user_name]);
        res.json(purchase_history.rows[0]);

    } catch(err){
        console.error(err.message);
    }
});

app.get("/display_selling_history",async(req,res)=>{
    const {user_name}=req.body;
    try{
        const sell_history=await pool.query("SELECT * FROM order WHERsell=$1",[user_name]);
        res.json(sell_history.rows[0]);

    } catch(err){
        console.error(err.message);
    }
});



app.post("/list_items",async(req,res)=>{
    try {
        const {
            user,
            title,
            photo,
            price,
            category,
            description
        }=req.body;
        const listing=await pool.query(
            "INSERT INTO item (user_listed, title, photo, price, category, description, list_time, item_status) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP(),$7) RETURNING *",
            [user,title,photo,price,category,description,"in stock"]
            );

        res.json(listing.rows[0]);

    } catch(err){
        console.error(err.message);
    }
});

app.post("/purchase",async(req,res)=>{
    try {
        const {
            item_id,
            seller,
            buyer,
            shipping_from,
            shipping_to,
        }=req.body;
        if(seller==buyer){
            res.json({message:"You cannot order your listed items"});
        }
        else{   
            const result=await pool.query("SELECT * FROM item WHERE item_id=$1",[item_id]);
            const price=result.rows[0].price;
            const result1=await pool.query("SELECT * FROM user WHERE user_name=$1",[buyer]);
            const BuyerBalance=result1.rows[0].credit;
            if(price>BuyerBalance){
                res.json({message:"Not enough credits to make this transcation"});
            }
            else{
                const purchase=await pool.query(
                    "INSERT INTO order (item_id,seller,buyer,shipping_from,shipping_to,order_status,order_date) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP()) RETURNING *",
                    [item_id,seller,buyer,shipping_from,shipping_to,"paid"]
                );
                await pool.query("UPDATE item SET item_status=$1 WHERE item_id=$2",["out of stock",item_id]);
                const NewBuyerBalance=BuyerBalance-price;
                const result3=await pool.query("SELECT * FROM user WHERE user_name=$1",[seller]);
                const SellerBalance=result3.rows[0].credit;
                const NewSellerBalance=SellerBalance+price;
                await pool.query("Update user SET credit=$1 WHERE user_name=$2",[NewBuyerBalance,buyer]);
                await pool.query("Update user SET credit=$1 WHERE user_name=$2",[NewSellerBalance,seller]);
                await pool.query("COMMIT");
                
                res.json(purchase.rows[0]);

            }  
        }

    } catch(err){
        console.error(err.message);
        await pool.query('ROLLBACK');
    }
});

app.listen(4000 || process.env.PORT, () =>
  console.log(`app is running on port ${process.env.PORT}`)
);