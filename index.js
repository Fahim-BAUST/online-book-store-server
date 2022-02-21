const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require("cors");
const ObjectId = require('mongodb').ObjectId;
const SSLCommerzPayment = require('sslcommerz')
const { v4: uuidv4 } = require('uuid');

require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

//stripe key
const stripe = require("stripe")('sk_test_51JypbOAGDt5ordsC3UdBfH8fq133BQl6BpSYzMjQokYuEPgqMSoCCu6abpnCwZhyKTwJmvZHOJGOkNtCHz4Bzluw00yAgPzcj3');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri = "mongodb+srv://bookstore:bookstore@cluster0.7wzpo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function run() {
    try {

        await client.connect();
        const database = client.db("bookStore");
        const bookCollection = database.collection("books");
        const userCollection = database.collection("user");
        const cartCollection = database.collection("cart");
        const orderCollection = database.collection("order");
        const reviewCollection = database.collection("review");

        // GET API 
        app.get('/books', async (req, res) => {
            const cursor = bookCollection.find({});
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });

        })

        // get cart products 
        app.get('/addToCart/cart/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const cursor = cartCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        //get review
        app.get('/review', async (req, res) => {
            const cursor = reviewCollection.find({});
            const result = await cursor.toArray();
            res.send(result);
        })


        //  search order by email
        app.get('/allOrders/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        //get particular order for payment
        app.get('/allOrders/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })

        //get all order
        app.get('/allOrders', async (req, res) => {
            const cursor = orderCollection.find({});
            const result = await cursor.toArray();
            res.send(result);
        })

        // POST API 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            console.log('hit');
            res.json(result)
        })

        // add to cart 
        app.post('/addToCart', async (req, res) => {
            const order = req.body;
            const result = await cartCollection.insertOne(order);
            res.json(result);
        })

        // add orders from cart
        app.post('/cartToOrders', async (req, res) => {

            order = req.body
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })

        //add review
        app.post('/addReview', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.json(result)
        });

        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;

            const amount = paymentInfo.totalPrice

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // add a product
        app.post('/addProduct', async (req, res) => {
            const newProduct = req.body;
            const result = await bookCollection.insertOne(newProduct);
            res.json(result);

        })




        // put api:  update 
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const option = { upsert: true }
            updateDoc = { $set: user }
            const result = await userCollection.updateOne(filter, updateDoc, option);
            res.json(result)
        });

        app.put('/allOrders/paymentStatus/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };

            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.json(result);

        })

        //update status
        app.put('/updateStatus/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body;

            const filter = { _id: ObjectId(id) };

            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    orderStatus: status.status
                }
            };
            const result = await orderCollection.updateOne(filter, updateDoc, options);
            res.json(result);

        })

        // make admin
        app.put('/user/admin', async (req, res) => {
            const user = req.body;

            const requesterAccount = await userCollection.findOne({ email: user.mainEmail });
            if (requesterAccount.role === 'admin') {
                const filter = { email: user.email };
                updateDoc = { $set: { role: 'admin' } }
                const result = await userCollection.updateOne(filter, updateDoc);

                res.json(result)
            }




        });


        // delete Api
        // delete from cart 
        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.json(result);
        })

        // delete full cart

        app.delete('/cartRemove/:email', async (req, res) => {
            const email = req.params.email;
            console.log(req.params.email);
            const query = { email: email };
            const result = await cartCollection.deleteMany(query);
            console.log(result);
            res.json(result);
        })

        // delete a particular order
        app.delete('/allOrders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        })

        // delete products
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookCollection.deleteOne(query);
            res.json(result);
        })


        //  Payment
        app.post('/init', async (req, res) => {
            console.log("hitting")
            const data = {
                total_amount: req.body.total_amount,
                currency: 'BDT',
                tran_id: uuidv4(),
                product_name: req.body.name,
                product_category: 'book',
                product_profile: 'none',
                product_image: 'none',
                success_url: 'http://localhost:5000/success',
                fail_url: 'http://localhost:5000/failure',
                cancel_url: 'http://localhost:5000/cancel',
                ipn_url: 'http://localhost:5000/ipn',
                paymentStatus: 'pending',
                shipping_method: 'Courier',
                cus_name: req.body.name,
                cus_email: req.body.email,
                cus_add1: req.body.address,
                cus_add2: req.body.address,
                cus_city: req.body.city,
                cus_state: req.body.city,
                cus_postcode: 1000,
                cus_country: 'Bangladesh',
                cus_phone: req.body.phone,
                cus_fax: '01711111111',
                ship_name: req.body.name,
                ship_add1: req.body.address,
                ship_add2: req.body.city,
                ship_city: req.body.city,
                ship_state: req.body.city,
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
                multi_card_name: 'mastercard',
                value_a: 'ref001_A',
                value_b: 'ref002_B',
                value_c: 'ref003_C',
                value_d: 'ref004_D',
                order: req.body.order,
                totalPrice: req.body.totalPrice,
                orderStatus: req.body.orderStatus,
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
            };

            // Insert paymentInfo info 
            const result = await orderCollection.insertOne(data);

            const sslcommer = new SSLCommerzPayment(`books620901692226a`, `books620901692226a@ssl`, false) //true for live default false for sandbox

            sslcommer.init(data).then(data1 => {
                //process the response that got from sslcommerz 
                //https://developer.sslcommerz.com/doc/v4/#returned-parameters
                const info = { ...data, ...data1 }
                // console.log(info.GatewayPageURL);
                if (info.GatewayPageURL) {
                    res.json(info.GatewayPageURL)
                    console.log('response hit');
                }
                else {
                    console.log('response not  hit');
                    return res.status(400).json({
                        message: "SSL session was not successful"
                    })
                }

            });
        });

        // bkash and others payment 
        app.post("/success", async (req, res) => {

            const result = await orderCollection.updateOne({ tran_id: req.body.tran_id }, {
                $set: {
                    val_id: req.body.val_id
                }
            })

            res.redirect(`http://localhost:3000/success/${req.body.tran_id}`)

        })
        app.post("/failure", async (req, res) => {
            const result = await orderCollection.deleteOne({ tran_id: req.body.tran_id })

            res.redirect(`http://localhost:3000`)
        })
        app.post("/cancel", async (req, res) => {
            const result = await orderCollection.deleteOne({ tran_id: req.body.tran_id })

            res.redirect(`http://localhost:3000`)
        })
        app.post("/ipn", (req, res) => {
            console.log(req.body)
            res.send(req.body);
        })
        app.post('/validate', async (req, res) => {
            const result = await orderCollection.findOne({
                tran_id: req.body.tran_id
            })

            if (result.val_id === req.body.val_id) {
                const update = await orderCollection.updateOne({ tran_id: req.body.tran_id }, {
                    $set: {
                        paymentStatus: 'paymentComplete'
                    }
                })
                console.log(update);
                res.send(update.modifiedCount > 0)

            }
            else {
                res.send("Chor detected")
            }

        })
        app.get('/orders/:tran_id', async (req, res) => {
            const id = req.params.tran_id;
            const result = await orderCollection.findOne({ tran_id: id })
            res.json(result)
        })

    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Hello !')
})



app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})