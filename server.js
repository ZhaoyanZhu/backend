const express=require("express");
const app=express();
const cors=require("cors");
const pool=require("./db");

app.use(cors());
app.use(express.json());

app.post("/list_items",async(req,res)=>{
    try {
        const {
            user,
            title,
            photo,
            price,
            description
        }=req.body;
        const listing=await pool.query(
            "INSERT INTO item (user_listed, title, photo, price, category, description, list_time, item_status) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP(),$7) RETURNING *",
            [user,title,photo,price,description,"in stock"]
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

app.listen(4000,()=>{
    console.log("server has started on port 4000");
})