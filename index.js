const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require("cors");
const ObjectId = require('mongodb').ObjectId;
// const admin = require("firebase-admin");
require('dotenv').config()


const app = express();
const port = process.env.PORT || 5000;

const stripe = require("stripe")('sk_test_51JypbOAGDt5ordsC3UdBfH8fq133BQl6BpSYzMjQokYuEPgqMSoCCu6abpnCwZhyKTwJmvZHOJGOkNtCHz4Bzluw00yAgPzcj3');

app.use(cors());
app.use(express.json());
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
            console.log(paymentInfo);
            const amount = paymentInfo.totalPrice * 100

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