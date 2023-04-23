CREATE DATABASE givetake;

CREATE TABLE user (
    user_name VARCHAR(150) NOT NULL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(100) UNIQUE,
    password VARCHAR(100),
    credit decimal
);

CREATE TABLE item (
    item_id BIGSERIAL NOT NULL PRIMARY KEY,
    user_listed VARCHAR(150) REFERENCES user(user_name),
    title VARCHAR(150) NOT NULL,
    photo bytea,
    price numeric(10,2) NOT NULL,
    description VARCHAR(3000),
    list_time TIMESTAMP NOT NULL,
    item_status VARCHAR(50) NOT NULL CHECK(item_status='in stock' OR item_status='out of stock'),
);

CREATE TABLE order (
    order_id BIGSERIAL NOT NULL PRIMARY KEY,
    item_id BIGINT NOT NULL REFERENCES item(item_id),
    seller VARCHAR(150) NOT NULL REFERENCES user(user_name),
    buyer VARCHAR(150) NOT NULL REFERENCES user(user_name),
    shipping_from VARCHAR(10000) NOT NULL,
    shipping_to VARCHAR(10000) NOT NULL,
    order_status VARCHAR(50) NOT NULL CHECK(order_status='paid' OR order_status='shipped' OR order_status='completed'),
    tracking VARCHAR(50),
    order_date TIMESTAMP NOT NULL,
    CHECK(seller!=buyer)
);

CREATE TABLE rating (
    rating_id BIGSERIAL NOT NULL PRIMARY KEY,
    rating_receiver VARCHAR(150) NOT NULL REFERENCES user(user_name);
    order BIGINT NOT NULL REFERENCES order(order_id),
    score NUMERIC(3,2) NOT NULL CHECK(score<=5),
    content VARCHAR(1000)
);