const MONGO_URL = `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`


const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
// graphQlHttp ->   Create a middleware function that can be passed to express which will 
//                  listen to the incoming requests and funnel them through graphql query parser
//                  and forward them to the right resolvers
const graphQlHttp = require('express-graphql');

// buildSchema ->   Function, takes a javascript template literal string which
//                  can be used to define schema. It takes a string which defines the
//                  schema.
const { buildSchema } = require('graphql');
const Event = require('./models/event')
// Creates a Express object to implement functionality
const app = express();

const events = [];

// Parses the json data to json
app.use(bodyParser.json());

// The location of root api request
//                  schema - points to a valid graphql schema
//                  rootValue - points to object that has all the resolver funstions in it
app.use('/', graphQlHttp({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type RootQuery {
            events: [Event!]!
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }    
    `),
    rootValue: {
        events: () => {
            return Event
                .find({})
                .then(events => {
                    return events.map(event => {
                        return { ...event._doc, _id: event.id, date: event.date };
                    });
                })
                .catch(err => {
                    console.log(err);
                    throw err;
                })
        },
        createEvent: (args) => {
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: new Date(args.eventInput.date),
            });
            // NECESSARY
            return event
                .save()
                .then(result => {
                    console.log(result)
                    return { ...result._doc, _id: event._doc._id.toString() };
                })
                .catch(err => {
                    console.log(err)
                    throw err
            })
        }
    },
    graphiql: true,
}));

mongoose.connect(MONGO_URL, (err) => {
    if (err) {
        console.log(err)
    } else {
        app.listen(3000, () => console.log("app running"));
    }
})
