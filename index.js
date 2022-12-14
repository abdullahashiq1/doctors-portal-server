const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pujys.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        await client.connect();
        const serviceCollection = client.db('doctors-portal').collection('services');
        const bookingCollection = client.db('doctors-portal').collection('bookings');
        const userCollection = client.db('doctors-portal').collection('users');
        const doctorsCollection = client.db('doctors-portal').collection('doctors');
        

        app.get('/service', async(req, res) =>{
            const query = {};
            const cursor = serviceCollection.find(query).project({name: 1});
            const services = await cursor.toArray();
            res.send(services);
        });

        app.put('/user/admin/:email', async(req, res) =>{
            const email = req.params.email;
           
            const filter = {email: email};
            const updateDoc = {
                $set: {role:'admin'},
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
        });

        app.put('/user/:email', async(req, res) =>{
            const email = req.params.email;
            const user  = req.body;
            const filter = {email: email};
            const options = {upsert: true};
            const updateDoc = {
                $set: user,
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        // const accessToken = jwt.sign({email: email}, tokenkey, { expiresIn: '1h' });
        res.send(result);
        });


         app.get('/available', async(req, res) =>{
            const date = req.query.date;

            // step 1:  get all services
            const services = await serviceCollection.find().toArray();

           // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
            const query = {date: date};
            const bookings = await bookingCollection.find(query).toArray();

            // step 3: for each service
            services.forEach(service=>{
                const serviceBooking = bookings.filter(book => book.treatment === service.name);
                const bookedSlots = serviceBooking.map(book => book.slot);
                const available = service.slots.filter(slot => !bookedSlots.includes(slot))
                service.slots = available;
      });
     

      res.send(services);
    });
        /**
         * API Naming Convention
         * app.get('/booking') // get all bookings in this collection, or get then one more or filter or query
         * app.get('/booking/:id') get a specific booking
         * app.post('/booking') // add a new booking
         * app.patch('/booking/:id') // update a new booking
         * app.put('/booking/:id')  // upsert ==> update(if exist) or insert (if dosen't exist)
         * app.delete('/booking/:id')
        **/

        app.get('/booking', async(req, res) =>{
            const patient = req.query.patient;
            const query = {patient: patient};
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })

        app.get('/user', async(req, res) =>{
            const users = await userCollection.find().toArray();
            res.send(users)
        })

        app.post('/booking', async(req, res) =>{
            const booking = req.body;
            const query = {treatment: booking.treatment, date: booking.date, patient: booking.patient}
            const exists = await bookingCollection.findOne(query);
            if(exists){
                return res.send({success: false, booking: exists})
            }
            const result = await bookingCollection.insertOne(booking);
            return res.send({success: true, result});

        });

        app.post('/doctor', async(req, res) =>{
            const doctor = req.body;
            const result = await doctorsCollection.insertOne(doctor);
            res.send(result);

        });

        app.get('/doctor', async (req, res) =>{
            const doctors = await doctorsCollection.find().toArray();
            res.send(doctors);
        })


    }
    finally{

    }
}

run().catch(console.dir);

app.get('/', (req, res)=>{
    res.send('Hello From Doctors')
})

app.listen(port, () => {
    console.log(`Doctors App listening ${port}`)
})

