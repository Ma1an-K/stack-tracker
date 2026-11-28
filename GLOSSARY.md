# Stack Tracker

The language of a home poker game's bookkeeping: who played, what they put in and took out, and who owes whom afterwards.

## Language

### People and groups

**Homegame**:
A group that plays together regularly, with its own **Members**, **Players**, **Sessions** and currency.
_Avoid_: Group, league, club

**Member**:
A user account that belongs to a **Homegame**, with a role of owner, admin or member.
_Avoid_: User (when you mean membership of a homegame)

**Player**:
A name on a **Homegame**'s roster whose results are tracked. A **Player** exists whether or not anyone has an account, and is linked to a **Member** only through a **Claim**.
_Avoid_: Participant, user

**Claim**:
A **Member**'s request to be linked to a **Player** as "this is me", approved or rejected by the homegame's owner only, never an admin.

**Invite code**:
A code that lets someone join a **Homegame** as a **Member**, optionally with an expiry and a maximum number of uses.

### Games

**Session**:
One finished game in a **Homegame** on a date, holding each **Player**'s **Buy-in** and **Cash-out**. Only **Sessions** feed the **Leaderboard**, stats and badges.
_Avoid_: Game (for a homegame's recorded game), match

**Live session**:
A draft of a game in progress, at most one per **Homegame**. It becomes a **Session** when the game is ended, and is invisible to stats until then.
_Avoid_: Active session, current game

**One-off game**:
A single game recorded outside any **Homegame**, as a personal record for the person who saved it. It has its own players by name and never feeds a **Leaderboard**.
_Avoid_: Quick game, ad-hoc session

### Money

**Buy-in**:
The total a **Player** put into a game, including every **Rebuy**.

**Rebuy**:
An additional amount a **Player** adds mid-game; it increases their **Buy-in**.
_Avoid_: Top-up, reload

**Cash-out**:
The amount a **Player** left the game with.

**Profit**:
**Cash-out** minus **Buy-in** for one **Player**, in one game or summed across **Sessions**. Positive is a win, negative a loss.
_Avoid_: Net, balance

**Payment**:
Money handed from one **Player** to another during the game, such as an early leaver paying their loss in cash. It reduces what the **Settlement** still asks of them and never affects stats.
_Avoid_: Transfer, settlement

**Settlement**:
The computed list of who pays whom after a game: the fewest **Transfers** that square every **Player**'s **Profit**, after **Payments**.
_Avoid_: Payout, payment

**Transfer**:
One line of a **Settlement**: an amount one **Player** still owes another.
_Avoid_: Payment (money already handed over during the game)

**Settled**:
The state of a **Session** once someone has marked in the app that its **Settlement** has been paid. A **Session** whose **Payments** covered everything is still not **Settled** until it is marked.

### Results

**Leaderboard**:
The ranking of a **Homegame**'s **Players** across all its **Sessions**.

**Badge**:
An achievement a **Player** earns from their **Session** history. A **Homegame** can disable individual badges.
_Avoid_: Achievement, trophy
