const Pool=require("pg").Pool;

const pool=new Pool({
    server:"localhost",
    database:"postgres",
    port:8888,
    password:"Aa!352934240",
    user:"postgres",
});

module.exports=pool;