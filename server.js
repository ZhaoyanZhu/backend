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
    try{
        const {user_name}=req.body;
        const result=await pool.query("SELECT user_name,first_name,last_name,email,phone,credit FROM user_table WHERE user_name=$1",[user_name]);
        res.json(result.rows[0]);

    } catch(err){
        console.error(err.message);
    }
});

app.get("/display_purchase_history",async(req,res)=>{
    try{
        const {user_name}=req.body;
        const purchase_history=await pool.query("SELECT * FROM order_table WHERE buyer=$1",[user_name]);
        res.json(purchase_history.rows);

    } catch(err){
        console.error(err.message);
    }
});

app.get("/display_selling_history",async(req,res)=>{
    try{
        const {user_name}=req.body;
        const sell_history=await pool.query("SELECT * FROM order_table WHERE seller=$1",[user_name]);
        res.json(sell_history.rows);

    } catch(err){
        console.error(err.message);
    }
});

app.get("/display_items",async(req,res)=>{
    try{
        const {category}=req.body;
        if (!category){
            const search_all=await pool.query("SELECT * FROM item_table WHERE item_status=$1",['in stock']);
            res.json(search_all.rows);
        }
        else{
            const search_category=await pool.query("SELECT * FROM item_table WEHERE item_status=$1 AND category=$2",['in stock',category]);
            res.json(search_category.rows);
        }
    } catch(err){
        console.error(err.message);
    }
});

app.post("/leave_comments",async(req,res)=>{
    try{
        const{rating_receiver,order_id,score,content}=req.body;
        const result=await pool.query("SELECT * FROM order_table WHERE order_id=$1",[order_id]);
        const order_status=result.rows[0].order_status;
        if (order_status != "completed"){
            res.json({message:"this order is not completed"});
        }
        else{
            const comment=await pool.query(
                "INSERT INTO rating_table (rating_receiver,order_id,score,content) VALUES($1,$2,$3,$4) RETURNING *"
                [rating_receiver,order_id,score,content]);
            res.json(comment.rows[0]);
        }
        
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
            "INSERT INTO item_table (user_listed, title, photo, price, category, description, list_time, item_status) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP(),$7) RETURNING *",
            [user,title,photo,price,category,description,'in stock']
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
            const result=await pool.query("SELECT * FROM item_table WHERE item_id=$1",[item_id]);
            const price=result.rows[0].price;
            const result1=await pool.query("SELECT * FROM user_table WHERE user_name=$1",[buyer]);
            const BuyerBalance=result1.rows[0].credit;
            if(price>BuyerBalance){
                res.json({message:"Not enough credits to make this transcation"});
            }
            else{
                const purchase=await pool.query(
                    "INSERT INTO order_table (item_id,seller,buyer,shipping_from,shipping_to,order_status,order_date) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP()) RETURNING *",
                    [item_id,seller,buyer,shipping_from,shipping_to,'paid']
                );
                await pool.query("UPDATE item_table SET item_status=$1 WHERE item_id=$2",['out of stock',item_id]);
                const NewBuyerBalance=BuyerBalance-price;
                const result3=await pool.query("SELECT * FROM user_table WHERE user_name=$1",[seller]);
                const SellerBalance=result3.rows[0].credit;
                const NewSellerBalance=SellerBalance+price;
                await pool.query("Update user_table SET credit=$1 WHERE user_name=$2",[NewBuyerBalance,buyer]);
                await pool.query("Update user_table SET credit=$1 WHERE user_name=$2",[NewSellerBalance,seller]);
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