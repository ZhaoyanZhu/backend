const express = require("express");
const cors = require("cors");
const pool = require("./db");

const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 4000;
const app = express();

// app.use(express.urlencoded({ extended: false }));
// app.use(express.json());
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));
app.use(bodyParser.json({ limit: "5mb" }));

app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your client's origin
    credentials: true,
  })
);

app.use(express.static("public"));

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get("/", (req, res) => {
  res.json("Welcome to the server");
});

app.get("/register", checkAuthenticated, (req, res) => {
  res.json("register");
});

app.get("/login", checkAuthenticated, (req, res) => {
  res.json("login");
});

// app.get("/dashboard", checkNotAuthenticated, (req, res) => {
//   res.json({ user: req.user.name });
// });

// app.get("/logout", (req, res) => {
//   // req.logOut();
//   // req.flash('success_msg', "You have logged out");
//   // res.redirect('/users/login');
// });

app.post("/register", async (req, res) => {
  let { username, email, password, password2 } = req.body;
  const credit = 1000;

  let errors = [];

  if (!username || !email || !password || !password2) {
    errors.push({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "Password should be at least 6 characters" });
  }

  if (password != password2) {
    errors.push({ message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    res.json({ err: errors });
  } else {
    let hashedPassword = await bcrypt.hash(password, 10);

    pool.query(
      `select * FROM user_table
                WHERE email = $1`,
      [email],
      (err, results) => {
        if (results.rows.length > 0) {
          errors.push({ message: "Email already registered" });
          res.json({ err: errors });
        } else {
          pool.query(
            `INSERT INTO user_table (username, email, password, credit)
                            VALUES ($1, $2, $3, $4)
                            RETURNING *`,
            [username, email, hashedPassword, credit],
            (err, results) => {
              if (err) {
                throw err;
              }
              res.json({
                username: username,
                email: email,
                credit: credit,
                charity: results.charity,
              });
            }
          );
        }
      }
    );
  }
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  const validUser = await pool.query(
    `select * FROM user_table
        WHERE email = $1`,
    [email]
  );

  if (validUser.rows.length === 0) {
    res.json({ err: "User does not exist" });
    return;
  }

  const validPassword = await bcrypt.compare(
    password,
    validUser.rows[0].password
  );

  if (!validPassword) {
    res.json({ err: "Password is incorrect" });
    return;
  }

  let user = validUser.rows[0];

  res.json({
    username: user.username,
    email: user.email,
    credit: user.credit,
    charity: user.charity,
  });
});

// app.get("/display_user_info", async (req, res) => {
//   try {
//     const { username } = req.body;
//     const result = await pool.query(
//       "SELECT username,first_name,last_name,email,phone,credit FROM user_table WHERE username=$1",
//       [username]
//     );
//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error(err.message);
//   }
// });

app.get("/display_purchase_history", async (req, res) => {
  try {
    const { user_name } = req.body;
    const purchase_history = await pool.query(
      "SELECT * FROM order_table WHERE buyer=$1",
      [user_name]
    );
    res.json(purchase_history.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/display_selling_history", async (req, res) => {
  try {
    const { username } = req.body;
    const sell_history = await pool.query(
      "SELECT * FROM order_table WHERE seller=$1",
      [username]
    );
    res.json(sell_history.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/display_items", async (req, res) => {
  try {
    const { category, gender } = req.body;
    if (!category && !gender) {
      const search_all = await pool.query(
        "SELECT * FROM item_table WHERE item_status=$1",
        ["in stock"]
      );
      res.json(search_all.rows);
    } else if (!gender) {
      const search_category = await pool.query(
        "SELECT * FROM item_table WHERE item_status=$1 AND category=$2",
        ["in stock", category]
      );
      res.json(search_category.rows);
    } else if (!category) {
      const search_gender = await pool.query(
        "SELECT * FROM item_table WHERE item_status=$1 AND gender=$2",
        ["in stock", gender]
      );
      res.json(search_gender.rows);
    } else {
      const search_category_gender = await pool.query(
        "SELECT * FROM item_table WHERE item_status=$1 AND category=$2 AND gender=$3",
        ["in stock", category, gender]
      );
      res.json(search_category_gender.rows);
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/leave_comments", async (req, res) => {
  try {
    const { rating_receiver, order_id, score, content } = req.body;
    const result = await pool.query(
      "SELECT * FROM order_table WHERE order_id=$1",
      [order_id]
    );
    const order_status = result.rows[0].order_status;
    if (order_status != "completed") {
      res.json({ message: "this order is not completed" });
    } else {
      const comment = await pool.query(
        "INSERT INTO rating_table (rating_receiver,order_id,score,content) VALUES($1,$2,$3,$4) RETURNING *"[
          (rating_receiver, order_id, score, content)
        ]
      );
      res.json(comment.rows[0]);
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/get_addr", async (req, res) => {
  const { user } = req.body;
  const result = await pool.query(
    "SELECT* \
  FROM address_table\
  WHERE user_email=$1",
    [user]
  );
  if (result.rows.length === 0) {
    res.json("");
    return;
  }
  res.json(result.rows[0]);
});

app.get("/display_comments", async (req, res) => {
  try {
    const { username } = req.body;
    const result = await pool.query(
      "SELECT * FROM rating_table WHERE rating_receiver=$1",
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.put("/shipping_order", async (req, res) => {
  try {
    const { order_id, tracking } = req.body;
    const result = await pool.query(
      "UPDATE order_table SET tracking=$1, order_status=$2 WHERE order_id=$3 RETURNING *",
      [tracking, "shipped", order_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

app.put("/confirm_order", async (req, res) => {
  try {
    const { order_id } = req.body;
    const result = await pool.query(
      "SELECT order_status FROM order_table WHERE order_id=$1",
      [order_id]
    );
    const order_status = result.rows[0].order_status;
    if (order_status == "paid") {
      res.json({ message: "The order hasn't shipped" });
    } else if (order_status == "shipped") {
      const result1 = await pool.query(
        "UPDATE order_table SET order_status=$1 WHERE order_id=$2 RETURNING *",
        ["completed", order_id]
      );
      res.json(result1.rows[0]);
    } else {
      res.json({
        message: "The order has been confirmed before, can't change again",
      });
    }
  } catch (err) {
    console.error(err.message);
  }
});

app.put("/list_items", (req, res) => {
  const {
    user,
    title,
    photo,
    price,
    gender,
    category,
    size,
    condition,
    description,
  } = req.body;
  if (!price) {
    res.json({ err: "price is required" });
    return;
  }
  if (!size) {
    res.json({ err: "size is required" });
    return;
  }
  if (!condition) {
    res.json({ err: "condition is required" });
    return;
  }
  pool.query(
    "INSERT INTO item_table (user_listed, title, photo, price, gender, category, size, condition, description, list_time, item_status)\
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,$10)\
       RETURNING *",
    [
      user,
      title,
      photo,
      price,
      gender,
      category,
      size,
      condition,
      description,
      "in stock",
    ]
  );
});

app.put("/add_addr", async (req, res) => {
  const { user, addr1, addr2, city, state, zip } = req.body;
  if (!user) {
    res.json({ err: "please login first" });
    return;
  }
  if (!addr1) {
    res.json({ err: "address is required" });
    return;
  }
  if (!city) {
    res.json({ err: "city is required" });
    return;
  }
  if (!state) {
    res.json({ err: "state is required" });
    return;
  }
  if (!zip) {
    res.json({ err: "zip is required" });
    return;
  }
  const result = await pool.query(
    "INSERT INTO address_table (user_email, address1, address2, city, state, zip_code) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
    [user, addr1, addr2, city, state, zip]
  );
  res.json(result);
});

app.post("/donation")


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
            const result1=await pool.query("SELECT * FROM user_table WHERE username=$1",[buyer]);
            const BuyerBalance=result1.rows[0].credit;
            if(price>BuyerBalance){
                res.json({message:"Not enough credits to make this transcation"});
            }
            else{
                const purchase=await pool.query(
                    "INSERT INTO order_table (item_id,seller,buyer,shipping_from,shipping_to,order_status,order_date) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) RETURNING *",
                    [item_id,seller,buyer,shipping_from,shipping_to,'paid']
                );
                await pool.query("UPDATE item_table SET item_status=$1 WHERE item_id=$2",['out of stock',item_id]);
                const NewBuyerBalance=BuyerBalance-price;
                const result3=await pool.query("SELECT * FROM user_table WHERE username=$1",[seller]);
                const SellerBalance=result3.rows[0].credit;
                const NewSellerBalance=SellerBalance+price;
                await pool.query("Update user_table SET credit=$1 WHERE username=$2",[NewBuyerBalance,buyer]);
                await pool.query("Update user_table SET credit=$1 WHERE username=$2",[NewSellerBalance,seller]);
                await pool.query("COMMIT");
                
                res.json(purchase.rows[0]);

            }  
        }
    } catch (err){
      console.error(err.message);
      }
});
// add items to the shopping cart
app.post("/cart", async (req, res) => {
  try {
    const { user,item_id } = req.body;
    const result = await pool.query(
      "INSERT INTO user_table (user_name,item_id,) VALUES ($1,$2) RETURNING *",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/donation",async(req,res)=>{
  try{
      const {donator,gender,category,condition}=req.body;
      earnedCredit=0;  
      if (gender=="men"){
          earnedCredit+=100;
      }   
      if (gender=="women"){
          earnedCredit+=100;
      }
      if (gender=="kids"){
          earnedCredit+=50;
      }
      if (category=="clothing"){
          earnedCredit+=100;
      }
      if (category=="shoes"){
          earnedCredit+=50;
      }
      if (condition=="half new"){
          earnedCredit-=25;
      }
      if (condition=="old"){
          earnedCredit-=50;
      }
      const donation=await pool.query(
          "INSERT INTO donation_table(donator,gender,category,condition) VALUES ($1,$2,$3,$4) RETURNING *",
          [donator,gender,category,condition]
      );
      const result=await pool.query("SELECT * FROM user_table WHERE username=$1",[donator]);
      const balance=result.rows[0].credit;
      const newBalance=balance+earnedCredit;
      await pool.query("UPDATE user_table SET credit=$1 WHERE username=$2",[newBalance,donator]);
      await pool.query("COMMIT");

      res.json(donation.rows[0]);

  } catch (err){
      console.error(err.message);
      await pool.query("ROLLBACK");
  }

});

app.get("/display_donations",async(req,res)=>{
  try{
      const {username}=req.body;
      const result=await pool.query("SELECT * FROM donation_table WHERE donator=$1",[username]);
      res.json(result.rows);

  } catch(err){
      console.error(err.message);
  }
});



app.listen(4000 || process.env.PORT, () =>
  console.log(`app is running on port ${process.env.PORT}`)
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}
