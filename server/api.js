/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");

// import models so we can interact with the database
const User = require("./models/user");
const Deck = require("./models/deck");
const Hand = require("./models/hand");

// import authentication library
const auth = require("./auth");

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

//initialize socket
const socketManager = require("./server-socket");

router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.get("/whoami", (req, res) => {
  if (!req.user) {
    // not logged in
    return res.send({});
  }

  res.send(req.user);
});

router.post("/initsocket", (req, res) => {
  // do nothing if user not logged in
  if (req.user) socketManager.addUser(req.user, socketManager.getSocketFromSocketID(req.body.socketid));
  res.send({});
});


// |------------------------------|
// | write your API methods below!|
// |------------------------------|

// now deck is just the discard pile
router.post("/deck", (req, res) => {
  if (req.body.action === "create") {
    const deck = new Deck({
      gameId: req.body.gameId,
      cards: req.body.cards
    });
    deck.save().then((data) => res.send(data)).catch((err) => console.log(err));

    socketManager.getIo().emit("deck", deck);
  } else if (req.body.action === "update") {
    Deck.findOne({gameId: req.body.gameId}).then((deck) => {
      deck.cards = req.body.cards;
      deck.save().then((deck) => res.send(deck)).catch((err) => console.log(err));

      socketManager.getIo().emit("updateDeck", deck);
    })
  } else if (req.body.action === "delete") {
    Deck.deleteOne({gameId: req.body.gameId}).then((deck) => {
      res.send(deck)
    })
  }
})

router.get("/deck", (req, res) => {
  Deck.find({gameId: req.query.gameId}).then((deck) => res.send(deck)).catch((err) => console.log(err))
})

router.post("/hand", (req, res) => {
  if (req.body.action === "create") {
    const hand = new Hand({
      gameId: req.body.gameId,
      cards: req.body.cards,
      playerId: req.user._id,
    });

    hand.save().then((data) => res.send(data)).catch((err) => console.log(err));

    socketManager.getIo().emit("hand", hand);
  } else if (req.body.action === "update") {
    Hand.findOne({gameId: req.body.gameId, playerId: req.user._id}).then((hand) => {
      hand.cards = req.body.cards;
      hand.save().then((deck) => res.send(deck)).catch((err) => console.log(err));

      socketManager.getIo().emit("updateHand", hand);
    })
  } else if (req.body.action === "delete") {
    Hand.deleteOne({gameId: req.body.gameId, playerId: req.user._id}).then((deck) => {
      res.send(deck)
    })
  }
})

router.get("/hand", (req, res) => {
  Hand.find({gameId: req.query.gameId, playerId: req.user._id}).then((deck) => res.send(deck)).catch((err) => console.log(err))
})

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
