const MONGO_URL = `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`


const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
// graphQlHttp ->   Create a middleware function that can be passed to express which will 
//                  listen to the incoming requests and funnel them through graphql query parser
//                  and forward them to the right resolvers
const graphQlHttp = require('express-graphql');

// buildSchema ->   Function, takes a javascript template literal string which
//                  can be used to define schema. It takes a string which defines the
//                  schema.
const { buildSchema } = require('graphql');
const Event = require('./models/event')
const User = require('./models/user');
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

        type User {
            _id: ID
            email: String!
            password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery {
            events: [Event!]!
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
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
                creator: '5df3cc3933b5ab0bd24c0e50'
            });
            let createdEvent;
            // NECESSARY
            // TODO: Fix function
            return event
                .save()
                .then(result => {
                    createdEvent = { ...result._doc, _id: event._doc._id.toString() };
                    return User.findById('5df3cc3933b5ab0bd24c0e50')
                })
                .then(user => {
                    if (!User) {
                        throw new Error('User does not exists')
                    }
                    user.createdEvents.push(event)
                    return user.save();
                })
                .then(result => {
                    return createdEvent;
                })
                .catch(err => {
                    console.log(err)
                    throw err
            })
        },
        createUser: (args) => {
            return User.findOne({email: args.userInput.email}).then(user => {
                if (user) {
                    throw new Error('User already exists')
                }
                return bcrypt.hash(args.userInput.password, 12)
            })
            .then(hashedPassword => {
                const user = new User({
                    email: args.userInput.email,
                    password: hashedPassword,
                });
                return user.save();
            })
            .then(result => {
                return { ...result._doc, password: null, _id: result.id }
            })
            .catch(err => {
                console.log(err)
                throw err
            })
        },
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
