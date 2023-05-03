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
    const { category, gender, user } = req.body;
    if (user) {
      const search_user = await pool.query(
        "SELECT * FROM item_table WHERE item_status=$1 AND user_listed=$2",
        ["in stock", user]
      );
      res.json(search_user.rows);
      return;
    }
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

app.get("/display_donations", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM donation_table");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
  }
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
  res.json({});
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

app.put("/edit_addr", async (req, res) => {
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
    "UPDATE address_table SET address1=$2, address2=$3, city=$4, state=$5, zip_code=$6 WHERE user_email=$1 RETURNING *",
    [user, addr1, addr2, city, state, zip]
  );
  res.json(result);
});

app.put("/new_donation", (req, res) => {
  const { user, title, description } = req.body;
  if (!user) {
    res.json({ err: "please login first" });
    return;
  }
  if (!title) {
    res.json({ err: "title is required" });
    return;
  }
  if (!description) {
    res.json({ err: "description is required" });
    return;
  }
  pool.query(
    "INSERT INTO donation_table (user_email, name, description, start_time)\
        VALUES($1,$2,$3,CURRENT_TIMESTAMP)",
    [user, title, description]
  );
  res.json({});
});

app.post("/donation_details", async (req, res) => {
  try {
    const { donation_id } = req.body;
    const result = await pool.query(
      "SELECT * FROM donation_table WHERE donation_id=$1",
      [donation_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/purchase", async (req, res) => {
  try {
    const { item_id, seller, buyer, shipping_from, shipping_to } = req.body;
    if (seller == buyer) {
      res.json({ message: "You cannot order your listed items" });
    } else {
      const result = await pool.query(
        "SELECT * FROM item_table WHERE item_id=$1",
        [item_id]
      );
      const price = result.rows[0].price;
      const result1 = await pool.query(
        "SELECT * FROM user_table WHERE username=$1",
        [buyer]
      );
      const BuyerBalance = result1.rows[0].credit;
      if (price > BuyerBalance) {
        res.json({ message: "Not enough credits to make this transcation" });
      } else {
        const purchase = await pool.query(
          "INSERT INTO order_table (item_id,seller,buyer,shipping_from,shipping_to,order_status,order_date) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) RETURNING *",
          [item_id, seller, buyer, shipping_from, shipping_to, "paid"]
        );
        await pool.query(
          "UPDATE item_table SET item_status=$1 WHERE item_id=$2",
          ["out of stock", item_id]
        );
        const NewBuyerBalance = BuyerBalance - price;
        const result3 = await pool.query(
          "SELECT * FROM user_table WHERE username=$1",
          [seller]
        );
        const SellerBalance = result3.rows[0].credit;
        const NewSellerBalance = SellerBalance + price;
        await pool.query("Update user_table SET credit=$1 WHERE username=$2", [
          NewBuyerBalance,
          buyer,
        ]);
        await pool.query("Update user_table SET credit=$1 WHERE username=$2", [
          NewSellerBalance,
          seller,
        ]);
        await pool.query("COMMIT");

        res.json(purchase.rows[0]);
      }
    }
  } catch (err) {
    console.error(err.message);
  }
});

// get item details
app.post("/item_details", async (req, res) => {
  try {
    const { item_id } = req.body;
    const result = await pool.query(
      "SELECT * FROM item_table WHERE item_id=$1",
      [item_id]
    );
    res.json(result.rows[0]);
    // console.log(result.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

// add items to the shopping cart
app.post("/cart", async (req, res) => {
  const { user_email, item_id } = req.body;
  // console.log(req.body);

  if (!user_email) {
    res.json({ err: "please login first" });
    return;
  }

  try {
    const result = await pool.query(
      "INSERT INTO shopping_cart (user_email, item_id) VALUES ($1, $2) RETURNING *",
      [user_email, item_id]
    );

    res
      .status(200)
      .json({ message: "Item added to cart", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding item to cart", error: err });
  }
});

// get items in the shopping cart
app.get("/getCart", async (req, res) => {
  const { user_email } = req.query;

  // console.log(req.query);

  if (!user_email) {
    res.json({ err: "please login first" });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM shopping_cart
       INNER JOIN item_table 
       ON shopping_cart.item_id = item_table.item_id
       WHERE shopping_cart.user_email = $1`,
      [user_email]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: err });
  }
});

// delete items in the shopping cart
app.delete("/deleteCartItem", async (req, res) => {
  const { user_email, item_id } = req.body;
  console.log(req.body);
  if (!user_email) {
    res.json({ err: "please login first" });
    return;
  }
  try {
    const result = await pool.query(
      "DELETE FROM shopping_cart WHERE user_email=$1 AND item_id=$2 RETURNING *",
      [user_email, item_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

// add purchased item to the purchase table
app.post("/purchase", async (req, res) => {
  try {
    const { item_id, user_email } = req.body;
    const getSeller = await pool.query(
      "SELECT email FROM item_table WHERE item_id=$1",
      [item_id]
    );
    if (user_email == getSeller.rows[0]) {
      res.json({ message: "You cannot order your listed items" });
    } else {
      const result = await pool.query(
        "SELECT * FROM item_table WHERE item_id=$1",
        [item_id]
      );
      const price = result.rows[0].price;
      const result1 = await pool.query(
        "SELECT * FROM user_table WHERE email=$1",
        [user_email]
      );
      const BuyerBalance = result1.rows[0].credit;
      if (price > BuyerBalance) {
        res.json({ message: "Not enough credits to make this transcation" });
      } else {
        const purchase = await pool.query(
          "INSERT INTO purchase_table (item_id,user_email,time) VALUES ($1,$2,CURRENT_TIMESTAMP) RETURNING *",
          [item_id, buyer]
        );
        await pool.query(
          "UPDATE item_table SET item_status=$1 WHERE item_id=$2",
          ["out of stock", item_id]
        );
        const NewBuyerBalance = BuyerBalance - price;
        const result3 = await pool.query(
          "SELECT * FROM user_table WHERE email=$1",
          [getSeller.rows[0].email]
        );
        const SellerBalance = result3.rows[0].credit;
        const NewSellerBalance = SellerBalance + price;
        await pool.query("Update user_table SET credit=$1 WHERE email=$2", [
          NewBuyerBalance,
          user_email,
        ]);
        await pool.query("Update user_table SET credit=$1 WHERE email=$2", [
          NewSellerBalance,
          getSeller.rows[0].email,
        ]);
        await pool.query("COMMIT");

        res.json(purchase.rows[0]);
      }
    }
  } catch (err) {
    pool.query("ROLLBACK"); // rollback the transaction if there is an error
    console.error(err.message);
  }
});

app.post("/donate_item", async (req, res) => {
  try {
    const { donation_id, item_id } = req.body;
    const result = await pool.query(
      "SELECT * FROM item_table WHERE item_id=$1",
      [item_id]
    );
    const item = result.rows[0];

    let earnedCredit = 0;
    if (item.gender == "Men") {
      earnedCredit += 700;
    }
    if (item.gender == "Women") {
      earnedCredit += 700;
    }
    if (item.gender == "Kids") {
      earnedCredit += 500;
    }
    if (item.category == "Clothing") {
      earnedCredit += 100;
    }
    if (item.category == "Shoes") {
      earnedCredit += 50;
    }
    if (item.condition == "Like New") {
      earnedCredit -= 75;
    }
    if (item.condition == "Good") {
      earnedCredit -= 125;
    }
    if (item.condition == "Fair") {
      earnedCredit -= 175;
    }
    if (item.condition == "Poor") {
      earnedCredit -= 300;
    }

    pool.query(
      "INSERT INTO donate_event_table (donation_id, item_id, donation_time, credit)\
        VALUES($1,$2,CURRENT_TIMESTAMP,$3)",
      [donation_id, item_id, earnedCredit],
      (err, result) => {
        if (err) {
          console.log(err);
          res.json({ err: err });
        } else {
          pool.query(
            "UPDATE item_table SET item_status=$1 WHERE item_id=$2",
            ["out of stock", item_id],
            (err, result) => {
              if (err) {
                console.log(err);
                res.json({ err: err });
              } else {
                pool.query(
                  "UPDATE user_table SET credit = credit + $1 WHERE email = $2 RETURNING *",
                  [earnedCredit, item.user_listed],
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      res.json({ err: err });
                    } else {
                      res.json(result.rows[0]);
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  } catch (err) {
    console.error(err.message);
    await pool.query("ROLLBACK");
  }
});

app.get("/display_donations", async (req, res) => {
  try {
    const { username } = req.body;
    const result = await pool.query(
      "INSERT INTO shopping_cart (user_email,item_id) VALUES ($1,$2) RETURNING *",
      [user_email, item_id]
    );
    res
      .status(200)
      .json({ message: "Item added to cart", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding item to cart", error: err });
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
