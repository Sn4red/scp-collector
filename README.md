# SCP Collector
SCP Collector is a Discord bot inspired by the SCP Foundation universe. Anomalies and files are transformed into collectible cards that can be traded
with other users. The cards are classified into different classes, with chances to obtain holographic versions.

---

# Features
- Card capture system (with rarity and holographic features incorporated).
- Card trading between users.
- Rank, level and XP system.
- Card fusion system.
- Market for purchasing cards.

---

# Storage
The bot relies heavily on Firebase for data storage and handling the core game logic.

---

# Overview
## Gameplay - Collecting Cards
The first step to start using the bot is to run the /`card` slash command. This not only creates a personalized visual card but also registers you in
Firestore with initial values and taking your ID as the document ID, to get you started in the game.

If you changed your Discord username, running the command again will update it so it appears correctly on your card.

It’s worth noting that using /`card` is not required to access the **information** commands. It’s only necessary when you want to use the bot’s main
functionality.

After registering, you can start capturing cards using /`capture`. You get 5 daily attempts, which reset at midnight (EST/EDT). Even if you haven't
used all of them, your attempts will reset to 5 at the start of the next day.

The rarity of the cards is defined by what is called 'class'. There is a set probability of obtaining each class, and depending on which one you get,
you receive a certain amount of **XP** and **crystals**:

| Class | Probability | XP | Crystals |
|---|---|---|---|
| Safe | 43% | 5 | 10 |
| Euclid | 30% | 15 | 20 |
| Keter | 21% | 30 | 30 |
| Thaumiel | 4% | 100 | 50 |
| Apollyon | 2% | 200 | 100 |

You can see all your cards in a list with the /`scp` command. If you want to see a specific one, you can use /`showcard` or /`viewcard`, in case you
just want to see it for yourself (as an ephemeral message).

## Gameplay - Merging Cards
A merge consists in transforming 5 cards and converting them into a single card of a higher class. This is useful when you want to make use of your
duplicate or less desired cards. The cards used can be from different classes, but the class of the resulting card will always be higher than the
class of the majority of the cards used. The following are examples of merges:

- 3 Safe and 2 Keter will merge to give a **Euclid** card.
- 4 Euclid and 1 Safe will merge to give a **Keter** card.
- 5 Euclid will merge to give a **Keter** card.

If there is no a single majority group of cards, for example, 2 Safe, 2 Euclid and 1 Keter, the result will be random between an **Euclid** or **Keter** card.

Note that you can only use Safe, Euclid and Keter cards.

There is also a chance that the result of the merge can be a holographic card, with the following probabilities:

| Holographic | Probability |
|---|---|
| Emerald | 7% |
| Golden | 2% |
| Diamond | 0.7% |

Just like when capturing cards, you can also earn crystals by performing merges, with the same values. However, you don't receive any XP.

## Gameplay - Market
SCP Collector features a market where 5 cards are sold weekly in exchange for crystals. The selection refreshes every Sunday at 12:05 a.m (EST/EDT), and the
same market is shared by all users. You can view it with the /`market` command and use /`buy` to purchase a card.

## Trading System
Card trades between users are always 1-to-1. Using the /`trade` command, you specify the user ID, the card you're offering, and the card you want in return. If
both have the cards, a request is created, and there's a 1-minute cooldown before the other party can accept it, for security reasons (in case of misclicks,
accidental sends, etc.). You can view the details and status of the trade using /`viewtrade`.

To cancel a trade you've sent (as long as it hasn't been accepted yet), use /`canceltrade`. To reject a trade you've received, use /`declinetrade`.

When using /`accepttrade`, the cards are exchanged. Additionally, any existing trade requests from either user that are no longer valid, such as offers involving
a card that has already been traded, are automatically deleted.

You can view your pending incoming trade requests using /`receivedtrades`. This displays a list showing the trade ID, creation date, and the username of the user
who sent it. To view all the trades you've sent, use the /`senttrades` command. This command shows a list of pending trades at the top, and a history of completed
trades at the bottom.

To control whether you want to receive trade requests or not, you can use the /`disabletrades` command to turn off this feature, and /`enabletrades` to turn it
back on (by default, it is enabled).

Finally, it is important to note that trade requests pending for at least one month are automatically deleted by the bot. To be precise, this is done every day at
11:00 p.m (EST/EDT).

## Information
There are several commands that provide useful information about the bot, with the most important being /`commands`. This lists all commands with a brief description of their usage!
