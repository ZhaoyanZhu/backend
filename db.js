const Pool=require("pg").Pool;

const pool=new Pool({
    server:"localhost",
    database:"givetake",
    port:5432,
    password:"zz2456",
    user:"postgres",
});

module.exports=pool;