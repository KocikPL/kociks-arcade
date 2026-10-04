/* ============================================================
   kocik's arcade — translations (EN / PL)
   ============================================================ */
"use strict";

var I18N = {
  en: {
    pointsLabel: "Your points",
    backMenu: "Back to menu",
    playAgain: "Play again",
    points: "points",
    dailyBonus: "Daily bonus: +50 points! (comes back tomorrow - no gambling)",
    freeEarners: "Free earners: games 1, 2, 4, 5, 7, 8, 9 pay prizes (no bets) + daily bonus",
    notEnough: "Not enough points - you need",
    morePts: "more.",
    purchasedMsg: "Purchased:",
    alreadyOwnedMsg: "You already own:",
    prizeWon: "Prize: {n} points!",
    prizeWord: "prize",
    correctShort: "Correct!",

    guessName: "Guess the Number",
    guessDesc: "find my secret number - free prizes",
    thinkingLbl: "I'm thinking of a number between",
    thinkingLbl2: "and",
    guessBtn: "Guess",
    guessInPh: "Your number",
    guessWin: "Correct! It was {n}!",
    guessOut: "Out of attempts! The number was {n}.",
    guessLow: "Too low!",
    guessHigh: "Too high!",
    guessLowWarm: "Too low! Getting warm!",
    guessHighWarm: "Too high! Getting warm!",
    attemptLbl: "Attempt",

    tttName: "Tic-Tac-Toe",
    tttDesc: "beat the computer AI (3 levels)",
    tttEasySub: "computer plays mostly random",
    tttMedSub: "computer wins and blocks",
    tttHardSub: "computer plays perfectly",
    tttIntro: "You are X, the computer is O. Pick a square.",
    tttThinking: "Computer is thinking...",
    tttTaken: "That square is taken.",

    rpsName: "Rock Paper Scissors",
    rpsDesc: "bet points, first to 3",
    rpsRule: "First to 3 round wins takes the match!",
    rpsRock: "Rock",
    rpsPaper: "Paper",
    rpsScissors: "Scissors",
    rpsYouPlayed: "You: {a}, computer: {b}.",
    rpsTie: "Round tie.",
    rpsRoundYou: "You win the round!",
    rpsRoundCpu: "Computer wins the round!",
    rpsScore: "Score: you {a} - {b} computer",
    rpsMatchYou: "You win the match {a}-{b}!",
    rpsMatchCpu: "Computer wins the match {a}-{b}.",
    betLbl: "Bet points (0 = no stakes)",
    startBtn: "Start",
    freeNote: "(You have no points - playing for free, no stakes.)",
    stakeSet: "Stake: {n} points - win the match to double it!",
    stakeDouble: "Your stake doubles: +{n} points (profit {p}).",
    stakeLost: "You lose your stake: {n} points.",

    hangName: "Hangman",
    hangDesc: "guess the word",
    hangRule: "6 wrong letters and you lose.",
    hangHelmetNote: "(Hangman Helmet equipped: your first miss will be absorbed.)",
    hangHelmetUsed: "No {l} in the word - but your helmet absorbs that miss!",
    hangNoLetter: "No {l} in the word!",
    hangLeft: "Wrong guesses left:",
    hangWord: "Word:",
    hangTried: "Tried:",
    hangWin: "You solved it! The word was {w}.",
    hangLose: "Out of guesses! The word was {w}.",
    hangAlready: "Letter {l} already picked.",

    memName: "Memory Match",
    memDesc: "find the 8 pairs",
    memTitle: "MEMORY - find all 8 pairs",
    memMoves: "moves:",
    memMatch: "Match! ({s})",
    memNoMatch: "No match: {a} was {s1}, {b} was {s2}.",
    memWin: "All pairs found in {n} moves!",

    hiloName: "Higher or Lower",
    hiloDesc: "card streaks + bets",
    hiloRule: "Cash out any time - or risk your stake!",
    hiloStake: "Stake: {n} points is in the pot.",
    hiloCurrent: "Current card:",
    hiloNext: "Next card:",
    hiloH: "Higher",
    hiloL: "Lower",
    hiloCorrect: "Correct! Streak: {n}",
    hiloPush: "Same value - push! Streak stays at {n}.",
    hiloWrong: "Wrong! Your final streak was {n}.",
    hiloCashNow: "Cash out now: {n} points",
    hiloCashBtn: "Cash out",
    hiloKeep: "Keep going",
    hiloCashed: "You cash out: +{n} points (stake back + {p} profit).",
    hiloFinish: "You finish with a streak of {n}.",
    ace: "Ace",
    jack: "Jack",
    queen: "Queen",
    king: "King",

    mathName: "Math Quiz",
    mathDesc: "10 questions, 4 levels",
    mathEasy: "Easy - small sums & subtraction",
    mathMed: "Medium - times tables & bigger numbers",
    mathHard: "Hard - big multiplications & division",
    mathExpert: "Expert - huge multiplications & divisions",
    mathPer: "+{n} per correct",
    mathQ: "Question {a} of {b}:",
    mathCorrect: "Correct!",
    mathWrong: "Wrong - the answer was {n}.",
    mathScore: "Final score: {a}/{b}",
    mathMissed: "Ones you missed:",
    mathPerfect: "Perfect score - all 10!",
    mathAnswer: "Answer",
    mathGo: "Check",

    minesName: "Minesweeper",
    minesDesc: "clear the minefield",
    minesEasy: "Easy - 6x6, 5 mines",
    minesMed: "Medium - 8x8, 10 mines",
    minesHard: "Hard - 10x10, 20 mines",
    minesFlag: "Flag mode",
    minesHelp: "Left-click: reveal / Right-click: flag (or flag mode)",
    minesBoom: "Boom! You hit a mine. Game over.",
    minesWin: "Board cleared - you win!",
    minesNew: "New game",

    bjName: "Blackjack",
    bjDesc: "get close to 21, bet points",
    bjRule: "Win pays 1:1, blackjack 2:1, push = stake back.",
    bjHit: "Hit",
    bjStand: "Stand",
    bjDealer: "Dealer",
    bjYou: "You",
    bjHole: "and one face-down card",
    bjTurn: "Dealer turns over:",
    bjHits: "Dealer hits:",
    bjBustYou: "You busted!",
    bjBustDeal: "Dealer busted!",
    bjFinal: "Final: you {a} vs dealer {b}.",
    bjPush: "Push - stake returned.",
    bjPushFree: "Push - it's a tie.",
    bjNatural: "BLACKJACK!",
    bjNaturalBoth: "Dealer has blackjack too - push!",
    bjWinFree: "You win!",
    bjLoseFree: "Dealer wins.",
    bjNaturalPay: "Blackjack pays 2:1 - you gain {n} points!",
    bjWinPay: "You win +{n} points!",
    bjLoseStake: "You lose your stake: {n} points.",
    bjRecord: "Record: {a} wins, {b} losses",
    bjAgain: "Play another hand?",
    bjStake: "Stake: {n} points.",
    bjDeal: "Deal",

    rltName: "Roulette",
    rltDesc: "red/black 1:1, number 35:1",
    rltRule: "Red and black pay 1:1. Green (0) and numbers pay 35:1.",
    rltNoPts: "No points to bet - earn some in a free game first!",
    rltRed: "Red",
    rltBlack: "Black",
    rltGreen: "Green (0)",
    rltNumber: "Number",
    rltPick: "Pick your number:",
    rltStake: "Stake",
    rltSpin: "SPIN!",
    rltOn: "You put {n} points on: {x}.",
    rltSpinning: "The wheel spins...",
    rltWinEven: "{x} pays 1:1 - you win {n} points!",
    rltJackpot: "35:1 - JACKPOT! You win {n} points!",
    rltLose: "No luck - {n} points gone.",
    rltAgain: "Spin again?",
    rltLeave: "Leave the table",
    rltBroke: "You're out of points! Earn more in the free games.",

    shopName: "Point Shop",
    shopDesc: "spend your points",
    shopYour: "Your points:",
    shopOwned: "OWNED",
    shopBuy: "Buy",
    itmGuess: "Extra Guess",
    itmHelmet: "Hangman Helmet",
    itmBanner: "Golden Banner",
    itmClover: "Lucky Clover",
    itmGuessD: "Guess the Number: +2 attempts every game",
    itmHelmetD: "Hangman: your first miss is absorbed",
    itmBannerD: "Golden banner lights up every screen (cosmetic)",
    itmCloverD: "+10% on every prize you win"
  },

  pl: {
    pointsLabel: "Twoje punkty",
    backMenu: "Powrót do menu",
    playAgain: "Zagraj ponownie",
    points: "punktów",
    dailyBonus: "Dzienny bonus: +50 punktów! (wróci jutro - bez hazardu)",
    freeEarners: "Darmowe zarobki: gry 1, 2, 4, 5, 7, 8, 9 dają nagrody (bez zakładów) + dzienny bonus",
    notEnough: "Za mało punktów - brakuje",
    morePts: "więcej.",
    purchasedMsg: "Kupiono:",
    alreadyOwnedMsg: "Już posiadasz:",
    prizeWon: "Nagroda: {n} punktów!",
    prizeWord: "nagroda",
    correctShort: "Poprawnie!",

    guessName: "Zgadnij Liczbę",
    guessDesc: "znajdź moją liczbę - darmowe nagrody",
    thinkingLbl: "Myślę o liczbie między",
    thinkingLbl2: "a",
    guessBtn: "Zgadnij",
    guessInPh: "Twoja liczba",
    guessWin: "Poprawnie! To było {n}!",
    guessOut: "Koniec prób! Liczba to {n}.",
    guessLow: "Za mało!",
    guessHigh: "Za dużo!",
    guessLowWarm: "Za mało! Robi się ciepło!",
    guessHighWarm: "Za dużo! Robi się ciepło!",
    attemptLbl: "Próba",

    tttName: "Kółko i Krzyżyk",
    tttDesc: "pokonaj komputer (3 poziomy)",
    tttEasySub: "komputer gra głównie losowo",
    tttMedSub: "komputer wygrywa i blokuje",
    tttHardSub: "komputer gra perfekcyjnie",
    tttIntro: "Jesteś krzyżykiem (X), komputer to kółko (O). Wybierz pole.",
    tttThinking: "Komputer myśli...",
    tttTaken: "To pole jest zajęte.",

    rpsName: "Kamień, Papier, Nożyce",
    rpsDesc: "zakłady, pierwszy do 3",
    rpsRule: "Pierwszy do 3 wygranych rund wygrywa mecz!",
    rpsRock: "Kamień",
    rpsPaper: "Papier",
    rpsScissors: "Nożyce",
    rpsYouPlayed: "Ty: {a}, komputer: {b}.",
    rpsTie: "Runda remisowa.",
    rpsRoundYou: "Wygrywasz rundę!",
    rpsRoundCpu: "Komputer wygrywa rundę!",
    rpsScore: "Wynik: ty {a} : {b} komputer",
    rpsMatchYou: "Wygrywasz mecz {a} - {b}!",
    rpsMatchCpu: "Komputer wygrywa mecz {a} - {b}.",
    betLbl: "Zakład w punktach (0 = bez stawki)",
    startBtn: "Zaczynaj",
    freeNote: "(Nie masz punktów - grasz za darmo, bez stawki.)",
    stakeSet: "Stawka: {n} punktów - wygraj mecz i podwoisz ją!",
    stakeDouble: "Stawka się podwaja: +{n} punktów (zysk {p}).",
    stakeLost: "Przegrywasz stawkę: {n} punktów.",

    hangName: "Wisielec",
    hangDesc: "odgadnij słowo",
    hangRule: "6 błędnych liter i przegrywasz.",
    hangHelmetNote: "(Hełm wisielca: Twój pierwszy błąd zostanie wchłonięty.)",
    hangHelmetUsed: "Brak litery {l} w słowie - ale hełm wchłania ten błąd!",
    hangNoLetter: "Brak litery {l} w słowie!",
    hangLeft: "Pozostałe błędy:",
    hangWord: "Słowo:",
    hangTried: "Wybrane:",
    hangWin: "Rozwiązałeś! Słowo to {w}.",
    hangLose: "Koniec prób! Słowo to {w}.",
    hangAlready: "Litera {l} już wybrana.",

    memName: "Memory",
    memDesc: "znajdź 8 par",
    memTitle: "MEMORY - znajdź wszystkie 8 par",
    memMoves: "ruchy:",
    memMatch: "Dopasowanie! ({s})",
    memNoMatch: "Brak pary: {a} to {s1}, {b} to {s2}.",
    memWin: "Wszystkie pary znalezione w {n} ruchach!",

    hiloName: "Wyższy czy Niższy",
    hiloDesc: "serie kart + zakłady",
    hiloRule: "Wypłać kiedy chcesz - albo ryzykuj stawkę!",
    hiloStake: "Stawka: {n} punktów leży w puli.",
    hiloCurrent: "Aktualna karta:",
    hiloNext: "Następna karta:",
    hiloH: "Wyższa",
    hiloL: "Niższa",
    hiloCorrect: "Poprawnie! Seria: {n}",
    hiloPush: "Ta sama wartość - push! Seria zostaje: {n}.",
    hiloWrong: "Błąd! Twoja końcowa seria to {n}.",
    hiloCashNow: "Wypłać teraz: {n} punktów",
    hiloCashBtn: "Wypłać",
    hiloKeep: "Kontynuuj",
    hiloCashed: "Wypłacasz: +{n} punktów (stawka + zysk {p}).",
    hiloFinish: "Koniec - Twoja seria to {n}.",
    ace: "As",
    jack: "Walet",
    queen: "Dama",
    king: "Król",

    mathName: "Quiz Matematyczny",
    mathDesc: "10 pytań, 4 poziomy",
    mathEasy: "Łatwy - małe sumy i odejmowanie",
    mathMed: "Średni - tabliczka mnożenia i większe liczby",
    mathHard: "Trudny - duże mnożenia i dzielenia",
    mathExpert: "Ekspert - ogromne mnożenia i dzielenia",
    mathPer: "+{n} za poprawną",
    mathQ: "Pytanie {a} z {b}:",
    mathCorrect: "Poprawnie!",
    mathWrong: "Źle - odpowiedź to {n}.",
    mathScore: "Wynik końcowy: {a}/{b}",
    mathMissed: "Twoje pomyłki:",
    mathPerfect: "Komplet punktów - wszystkie 10!",
    mathAnswer: "Odpowiedź",
    mathGo: "Sprawdź",

    minesName: "Saper",
    minesDesc: "rozbroj pole min",
    minesEasy: "Łatwy - 6x6, 5 min",
    minesMed: "Średni - 8x8, 10 min",
    minesHard: "Trudny - 10x10, 20 min",
    minesFlag: "Tryb flagi",
    minesHelp: "LPM: odsłoń / PPM: flaga (albo tryb flagi)",
    minesBoom: "BUM! Trafiłeś na minę. Koniec gry.",
    minesWin: "Plansza wyczyszczona - wygrywasz!",
    minesNew: "Nowa gra",

    bjName: "Blackjack",
    bjDesc: "zbliż się do 21, zakładaj punkty",
    bjRule: "Wygrana płaci 1:1, blackjack 2:1, push = zwrot stawki.",
    bjHit: "Dobierz",
    bjStand: "Pasa",
    bjDealer: "Krupier",
    bjYou: "Ty",
    bjHole: "oraz jedna zakryta karta",
    bjTurn: "Krupier odkrywa:",
    bjHits: "Krupier dobiera:",
    bjBustYou: "Przekroczyłeś 21!",
    bjBustDeal: "Krupier przekroczył 21!",
    bjFinal: "Finał: ty {a} vs krupier {b}.",
    bjPush: "Push - stawka zwrócona.",
    bjPushFree: "Push - remis.",
    bjNatural: "BLACKJACK!",
    bjNaturalBoth: "Krupier też ma blackjacka - push!",
    bjWinFree: "Wygrywasz!",
    bjLoseFree: "Wygrywa krupier.",
    bjNaturalPay: "Blackjack płaci 2:1 - zyskujesz {n} punktów!",
    bjWinPay: "Wygrywasz +{n} punktów!",
    bjLoseStake: "Przegrywasz stawkę: {n} punktów.",
    bjRecord: "Bilans: {a} wygranych, {b} przegranych",
    bjAgain: "Zagrać jeszcze raz?",
    bjStake: "Stawka: {n} punktów.",
    bjDeal: "Rozdaj",

    rltName: "Ruletka",
    rltDesc: "czerwony/czarny 1:1, liczba 35:1",
    rltRule: "Czerwony i czarny płacą 1:1. Zielony (0) i liczby płacą 35:1.",
    rltNoPts: "Nie masz punktów do zakładów - zarób w darmowej grze!",
    rltRed: "Czerwony",
    rltBlack: "Czarny",
    rltGreen: "Zielony (0)",
    rltNumber: "Liczba",
    rltPick: "Wybierz swoją liczbę:",
    rltStake: "Stawka",
    rltSpin: "KRĘĆ!",
    rltOn: "Postawiono {n} punktów na: {x}.",
    rltSpinning: "Koło się kręci...",
    rltWinEven: "{x} płaci 1:1 - wygrywasz {n} punktów!",
    rltJackpot: "35:1 - JACKPOT! Wygrywasz {n} punktów!",
    rltLose: "Nie tym razem - {n} punktów przepadło.",
    rltAgain: "Kręcić jeszcze raz?",
    rltLeave: "Odejdź od stołu",
    rltBroke: "Skończyły Ci się punkty! Zarabiaj w darmowych grach.",

    shopName: "Sklep Punktowy",
    shopDesc: "wydatkuj swoje punkty",
    shopYour: "Twoje punkty:",
    shopOwned: "KUPIONE",
    shopBuy: "Kup",
    itmGuess: "Dodatkowa Próba",
    itmHelmet: "Hełm Wisielca",
    itmBanner: "Złoty Baner",
    itmClover: "Szczęśliwa Koniczyna",
    itmGuessD: "Zgadnij Liczbę: +2 próby w każdej grze",
    itmHelmetD: "Wisielec: Twój pierwszy błąd zostaje wchłonięty",
    itmBannerD: "Złoty baner rozświetla każdy ekran (kosmetyka)",
    itmCloverD: "+10% do każdej nagrody, którą wygrywasz"
  }
};

/* ---------- extra keys ---------- */
I18N.en.guessEasy = "Easy - 1 to 50, {n} attempts (prize 20)";
I18N.en.guessMed = "Medium - 1 to 100, {n} attempts (prize 50)";
I18N.en.guessHard = "Hard - 1 to 200, {n} attempts (prize 100)";
I18N.en.guessRange = "Type a number between {a} and {b}.";
I18N.en.mathRange = "Type a whole number.";
I18N.en.levelEasy = "Easy";
I18N.en.levelMedium = "Medium";
I18N.en.levelHard = "Hard";
I18N.en.levelExpert = "Expert";
I18N.en.youWin = "You win! Nice job!";
I18N.en.computerWins = "Computer wins!";
I18N.en.drawGame = "It's a draw!";

I18N.pl.guessEasy = "Łatwy - 1 do 50, {n} prób (nagroda 20)";
I18N.pl.guessMed = "Średni - 1 do 100, {n} prób (nagroda 50)";
I18N.pl.guessHard = "Trudny - 1 do 200, {n} prób (nagroda 100)";
I18N.pl.guessRange = "Wpisz liczbę między {a} a {b}.";
I18N.pl.mathRange = "Wpisz liczbę całkowitą.";
I18N.pl.levelEasy = "Łatwy";
I18N.pl.levelMedium = "Średni";
I18N.pl.levelHard = "Trudny";
I18N.pl.levelExpert = "Ekspert";
I18N.pl.youWin = "Wygrywasz! Świetnie!";
I18N.pl.computerWins = "Komputer wygrywa!";
I18N.pl.drawGame = "Remis!";
I18N.en.pongName = "Pong";
I18N.en.pongDesc = "beat the computer paddle";
I18N.pl.pongName = "Pong";
I18N.pl.pongDesc = "pokonaj komputerową rakietę";

I18N.en.siteTitle = "kocik's arcade";
I18N.en.menuTagline = "12 games - points - point shop";
I18N.en.youHave = "You have {n} points";
I18N.en.menuPick = "pick a game";
I18N.pl.siteTitle = "kocik's arcade";
I18N.pl.menuTagline = "12 gier - punkty - sklep";
I18N.pl.youHave = "Masz {n} punktów";
I18N.pl.menuPick = "wybierz grę";

I18N.en.mpTag = "+ vs friend";
I18N.en.mpHint = "Play on another PC/Laptop: create a room, share the 4-digit code, they join with JOIN.";
I18N.en.mpCreate = "Create room";
I18N.en.mpJoin = "Join room";
I18N.en.mpRoomLobby = "Room lobby";
I18N.en.mpMatchmaking = "Matchmaking";
I18N.en.mpYourName = "Your name (optional)";
I18N.en.mpEnterCode = "4-digit room code";
I18N.en.mpCreateGo = "Create the room";
I18N.en.mpJoinGo = "Join room";
I18N.en.mpRoomCode = "ROOM CODE";
I18N.en.mpCopyCode = "click the code to copy it";
I18N.en.mpCopied = "Room code copied!";
I18N.en.mpPlayers = "Players";
I18N.en.mpLeave = "Leave room";
I18N.en.mpKick = "Kick";
I18N.en.mpWatch = "Watch";
I18N.en.mpStopWatch = "Stop watching";
I18N.en.mpWatching = "WATCHING:";
I18N.en.mpLobby = "in lobby";
I18N.en.mpInGame = "playing...";
I18N.en.mpWaiting = "Looking for an opponent... (LEAVE to cancel)";
I18N.en.mpNotInRoom = "Create or join a room first!";
I18N.en.mpNotFound = "Room not found or the host is offline.";
I18N.en.mpKicked = "The host removed you from the room.";
I18N.en.mpHostLeft = "The host closed the room.";
I18N.en.mpLost = "Connection lost.";
I18N.en.mpJoined = "{n} joined the room.";
I18N.en.mpOppLeft = "Your opponent left the game.";
I18N.en.mpYourTurn = "Your move!";
I18N.en.mpWaitTurn = "Waiting for the opponent...";
I18N.en.mpYouWin = "You win!";
I18N.en.mpOppWins = "The opponent wins!";
I18N.en.mpDraw = "It's a draw!";
I18N.en.mpGuessRule = "Guess the number 1-100 in 5 tries. First to find it wins!";
I18N.en.mpOppGuess = "Opponent guessed ({n} tries left)";
I18N.en.mpNoNet = "Could not start networking - are you online?";
I18N.en.mpBackLobby = "(back in the lobby)";
I18N.en.mpConnecting = "Connecting...";
I18N.pl.mpTag = "+ vs znajomy";
I18N.pl.mpHint = "Graj na innym PC/laptopie: załóż pokój, podaj 4-cyfrowy kod, znajomy dołącza przez DOŁĄCZ.";
I18N.pl.mpCreate = "Załóż pokój";
I18N.pl.mpJoin = "Dołącz do pokoju";
I18N.pl.mpRoomLobby = "Lobby pokoju";
I18N.pl.mpMatchmaking = "Dobieranie graczy";
I18N.pl.mpYourName = "Twoja nazwa (opcjonalnie)";
I18N.pl.mpEnterCode = "4-cyfrowy kod pokoju";
I18N.pl.mpCreateGo = "Utwórz pokój";
I18N.pl.mpJoinGo = "Dołącz";
I18N.pl.mpRoomCode = "KOD POKOJU";
I18N.pl.mpCopyCode = "kliknij kod, aby skopiować";
I18N.pl.mpCopied = "Skopiowano kod pokoju!";
I18N.pl.mpPlayers = "Gracze";
I18N.pl.mpLeave = "Opuść pokój";
I18N.pl.mpKick = "Wyrzuć";
I18N.pl.mpWatch = "Obserwuj";
I18N.pl.mpStopWatch = "Przestań obserwować";
I18N.pl.mpWatching = "OBSERWUJESZ:";
I18N.pl.mpLobby = "w lobby";
I18N.pl.mpInGame = "w grze...";
I18N.pl.mpWaiting = "Szukam przeciwnika... (OPUŚĆ = anuluj)";
I18N.pl.mpNotInRoom = "Najpierw załóż lub dołącz do pokoju!";
I18N.pl.mpNotFound = "Nie znaleziono pokoju lub host jest offline.";
I18N.pl.mpKicked = "Host wyrzucił Cię z pokoju.";
I18N.pl.mpHostLeft = "Host zamknął pokój.";
I18N.pl.mpLost = "Utracono połączenie.";
I18N.pl.mpJoined = "{n} dołączył do pokoju.";
I18N.pl.mpOppLeft = "Twój przeciwnik opuścił grę.";
I18N.pl.mpYourTurn = "Twój ruch!";
I18N.pl.mpWaitTurn = "Czekam na przeciwnika...";
I18N.pl.mpYouWin = "Wygrywasz!";
I18N.pl.mpOppWins = "Wygrywa przeciwnik!";
I18N.pl.mpDraw = "Remis!";
I18N.pl.mpGuessRule = "Zgadnij liczbę 1-100 w 5 próbach. Pierwszy, kto znajdzie, wygrywa!";
I18N.pl.mpOppGuess = "Przeciwnik zgaduje (zostało prób: {n})";
I18N.pl.mpNoNet = "Nie można uruchomić sieci - czy masz internet?";
I18N.pl.mpBackLobby = "(wrócił do lobby)";
I18N.pl.mpConnecting = "Łączenie...";
