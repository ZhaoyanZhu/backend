CREATE TABLE address_table
(
    address1 character varying COLLATE pg_catalog."default" NOT NULL,
    user_email character varying COLLATE pg_catalog."default",
    address2 character varying COLLATE pg_catalog."default",
    address_id bigint NOT NULL DEFAULT nextval('address_table_address_id_seq'::regclass),
    state character varying COLLATE pg_catalog."default" NOT NULL,
    zip_code character varying COLLATE pg_catalog."default" NOT NULL,
    city character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT primary_key UNIQUE (address_id),
    CONSTRAINT address_table_user_email_fkey FOREIGN KEY (user_email)
        REFERENCES public.user_table (email) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

CREATE TABLE donate_event_table
(
    event_id bigint NOT NULL DEFAULT nextval('donate_event_table_event_id_seq'::regclass),
    donation_id bigint NOT NULL,
    item_id bigint NOT NULL,
    donation_time time with time zone NOT NULL,
    credit bigint NOT NULL,
    CONSTRAINT donate_event_table_pkey PRIMARY KEY (event_id),
    CONSTRAINT donate_event_table_donation_id_fkey FOREIGN KEY (donation_id)
        REFERENCES public.donation_table (donation_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT donate_event_table_item_id_fkey FOREIGN KEY (item_id)
        REFERENCES public.item_table (item_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

CREATE TABLE donation_table
(
    donation_id bigint NOT NULL DEFAULT nextval('donation_table_donation_id_seq'::regclass),
    start_time time with time zone NOT NULL,
    name character varying COLLATE pg_catalog."default",
    description character varying COLLATE pg_catalog."default",
    user_email character varying COLLATE pg_catalog."default",
    CONSTRAINT donation_table_pkey PRIMARY KEY (donation_id),
    CONSTRAINT donation_table_user_email_fkey FOREIGN KEY (user_email)
        REFERENCES public.user_table (email) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

CREATE TABLE item_table
(
    item_id bigint NOT NULL DEFAULT nextval('item_table_item_id_seq'::regclass),
    user_listed character varying(150) COLLATE pg_catalog."default",
    title character varying(150) COLLATE pg_catalog."default" NOT NULL,
    price numeric(10,2) NOT NULL,
    category character varying(50) COLLATE pg_catalog."default",
    description character varying(3000) COLLATE pg_catalog."default",
    list_time timestamp without time zone NOT NULL,
    item_status character varying(50) COLLATE pg_catalog."default" NOT NULL,
    gender character varying COLLATE pg_catalog."default" NOT NULL,
    size character varying COLLATE pg_catalog."default" NOT NULL,
    condition character varying COLLATE pg_catalog."default" NOT NULL,
    photo character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT item_table_pkey PRIMARY KEY (item_id),
    CONSTRAINT item_table_user_email_fkey FOREIGN KEY (user_listed)
        REFERENCES public.user_table (email) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT item_table_item_status_check CHECK (item_status::text = 'in stock'::text OR item_status::text = 'out of stock'::text)
)

CREATE TABLE purchase_table
(
    purchase_id bigint NOT NULL DEFAULT nextval('purchase_table_purchase_id_seq'::regclass),
    user_email character varying COLLATE pg_catalog."default" NOT NULL,
    item_id bigint NOT NULL,
    "time" time with time zone,
    rating bigint,
    CONSTRAINT purchase_table_pkey PRIMARY KEY (purchase_id),
    CONSTRAINT purchase_table_item_id_fkey FOREIGN KEY (item_id)
        REFERENCES public.item_table (item_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT purchase_table_user_email_fkey FOREIGN KEY (user_email)
        REFERENCES public.user_table (email) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

CREATE TABLE shopping_cart
(
    user_email character varying COLLATE pg_catalog."default" NOT NULL,
    item_id bigint NOT NULL,
    CONSTRAINT shopping_cart_pkey PRIMARY KEY (user_email, item_id),
    CONSTRAINT shopping_cart_user_email_fkey FOREIGN KEY (user_email)
        REFERENCES public.user_table (email) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT shopping_key_item_id_fkey FOREIGN KEY (item_id)
        REFERENCES public.item_table (item_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

CREATE TABLE user_table
(
    username character varying(150) COLLATE pg_catalog."default" NOT NULL,
    first_name character varying(100) COLLATE pg_catalog."default",
    last_name character varying(100) COLLATE pg_catalog."default",
    email character varying(150) COLLATE pg_catalog."default",
    phone character varying(100) COLLATE pg_catalog."default",
    password character varying(100) COLLATE pg_catalog."default",
    credit numeric,
    charity character varying COLLATE pg_catalog."default",
    CONSTRAINT user_table_pkey PRIMARY KEY (username),
    CONSTRAINT user_table_email_key UNIQUE (email),
    CONSTRAINT user_table_phone_key UNIQUE (phone)
)