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
    freeEarners: "no points? games 1, 2, 4, 5, 7, 8, 9 and 12-18 pay prizes - you can't lose + 50 a day",
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
    freeEarners: "nie masz punktów? gry 1, 2, 4, 5, 7, 8, 9 i 12-18 płacą - nie możesz przegrać + 50 dziennie",
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
I18N.en.menuTagline = "20 games i made myself - no ads, no tracking :)";
I18N.en.youHave = "You have {n} points";
I18N.en.menuPick = "which one are you playing?";
I18N.pl.siteTitle = "kocik's arcade";
I18N.pl.menuTagline = "20 gier, sam napisałem - bez reklam, bez śledzenia :)";
I18N.pl.youHave = "Masz {n} punktów";
I18N.pl.menuPick = "w ktora grasz?";

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
I18N.en.mpNoNet = "network problem ({e}) - check your internet and refresh :)";
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
I18N.pl.mpNoNet = "problem z siecią ({e}) - sprawdź internet i odśwież :)";
I18N.pl.mpBackLobby = "(wrócił do lobby)";
I18N.pl.mpConnecting = "Łączenie...";

I18N.en.menuHello = "hi :) i'm kocik - i made these games, probably too many of them";
I18N.pl.menuHello = "cześć :) tu kocik - zrobiłem te gry, chyba ich za dużo";

I18N.en.mpNoLib = "multiplayer library didn't load - refresh the page :(";
I18N.en.mpSlowNet = "still connecting... keep the host's tab open!";
I18N.pl.mpNoLib = "biblioteka multiplayer się nie wczytała - odśwież stronę :(";
I18N.pl.mpSlowNet = "łączenie... nie zamykaj karty hosta!";

I18N.en.c4Name = "Connect Four";
I18N.en.c4Desc = "drop discs, get 4 in a row";
I18N.en.c4Intro = "You are X (white disc), the computer is O. Click a column to drop.";
I18N.en.c4EasySub = "computer plays sloppy";
I18N.en.c4MedSub = "computer wins and blocks";
I18N.en.c4HardSub = "computer plays strong";
I18N.en.c4Full = "That column is full - pick another!";
I18N.en.g2048Name = "2048";
I18N.en.g2048Desc = "slide tiles, merge numbers, reach 2048";
I18N.en.g2048Rule = "arrows / WASD or the buttons. merge two equal tiles!";
I18N.en.g2048Over = "No moves left! Final score: {n}.";
I18N.en.g2048Reached = "YOU REACHED 2048!!! Absolute legend.";
I18N.pl.c4Name = "Czwórki";
I18N.pl.c4Desc = "wrzuć dyski, ustaw 4 w rzędzie";
I18N.pl.c4Intro = "Jesteś X (biały dysk), komputer to O. Kliknij kolumnę.";
I18N.pl.c4EasySub = "komputer gra słabo";
I18N.pl.c4MedSub = "komputer wygrywa i blokuje";
I18N.pl.c4HardSub = "komputer gra mocno";
I18N.pl.c4Full = "Ta kolumna jest pełna - wybierz inną!";
I18N.pl.g2048Name = "2048";
I18N.pl.g2048Desc = "przesuwaj kafelki, łącz liczby, dojdź do 2048";
I18N.pl.g2048Rule = "strzałki / WASD albo przyciski. łącz równe kafelki!";
I18N.pl.g2048Over = "Brak ruchów! Wynik końcowy: {n}.";
I18N.pl.g2048Reached = "DOGODZIŁEŚ DO 2048!!! Legenda.";

I18N.en.codeHint = "hint: a school";
I18N.en.codeOk = "code accepted! 2 secret games unlocked";
I18N.en.codeBad = "nope, that's not it. hint: a school";
I18N.en.rxName = "Reaction Test";
I18N.en.rxDesc = "secret: click when it turns on";
I18N.en.rxRule = "click, wait for the green - then CLICK as fast as you can. under 250ms = 40 points!";
I18N.en.rxStart = "click to start";
I18N.en.rxWait = "wait... don't click!";
I18N.en.rxGo = "CLICK NOW!";
I18N.en.rxEarly = "too soon! click to retry";
I18N.en.rxTime = "Your time: {n} ms";
I18N.en.rxRetry = "click to retry";
I18N.en.diceName = "Dice";
I18N.en.diceDesc = "secret: bet high or low";
I18N.en.diceRule = "bet, pick high (8-12) or low (2-6). rolling a 7 = push, stake comes back.";
I18N.en.diceHigh = "HIGH";
I18N.en.diceLow = "LOW";
I18N.en.diceRoll = "rolled {s}";
I18N.en.dicePush = "push - stake back";
I18N.en.diceWin = "you win {n} points!";
I18N.en.diceLose = "you lose {n} points";
I18N.pl.codeHint = "podpowiedź: szkoła";
I18N.pl.codeOk = "kod przyjęty! 2 tajne gry odblokowane";
I18N.pl.codeBad = "nie to. podpowiedź: szkoła";
I18N.pl.rxName = "Test Reakcji";
I18N.pl.rxDesc = "tajne: kliknij, gdy się zaświeci";
I18N.pl.rxRule = "kliknij, poczekaj na sygnał - potem KLIKNIJ jak najszybciej. poniżej 250ms = 40 punktów!";
I18N.pl.rxStart = "kliknij, aby start";
I18N.pl.rxWait = "czekaj... nie klikaj!";
I18N.pl.rxGo = "KLIKNIJ TERAZ!";
I18N.pl.rxEarly = "za wcześnie! kliknij ponownie";
I18N.pl.rxTime = "Twój czas: {n} ms";
I18N.pl.rxRetry = "kliknij, aby powtórzyć";
I18N.pl.diceName = "Kostki";
I18N.pl.diceDesc = "tajne: zakładaj high albo low";
I18N.pl.diceRule = "zakład, wybierz high (8-12) lub low (2-6). wyrzucone 7 = push, stawka wraca.";
I18N.pl.diceHigh = "HIGH";
I18N.pl.diceLow = "LOW";
I18N.pl.diceRoll = "wyrzucono {s}";
I18N.pl.dicePush = "push - stawka wraca";
I18N.pl.diceWin = "wygrywasz {n} punktów!";
I18N.pl.diceLose = "przegrywasz {n} punktów";

I18N.en.seqName = "Sequence";
I18N.en.seqDesc = "watch the pattern, repeat it";
I18N.en.seqRule = "watch the flashing pattern, then repeat it with the buttons. one wrong move ends the run!";
I18N.en.seqIdle = "press start when ready";
I18N.en.seqWatch = "watch...";
I18N.en.seqTurn = "your turn - repeat it!";
I18N.en.seqRound = "round {n}";
I18N.en.seqFail = "wrong! you survived {n} rounds.";
I18N.en.slotName = "Slots";
I18N.en.slotDesc = "secret: three reels, one lever";
I18N.en.slotRule = "match the reels: three of a kind pays 5x your bet, a pair pays 2x back.";
I18N.en.slotSpin = "PULL THE LEVER";
I18N.en.slotTriple = "THREE OF A KIND!";
I18N.en.slotPair = "a pair!";
I18N.en.slotWin = "+{n} points!";
I18N.en.slotLose = "no match - {n} points gone";
I18N.en.slotFree = "(free play - no prize)";
I18N.en.dodName = "Double or Nothing";
I18N.en.dodDesc = "secret: call the coin, cash out big";
I18N.en.dodRule = "call the coin right and your pot doubles. one wrong call = you lose it all. cash out any time, max 8 flips!";
I18N.en.dodHeads = "HEADS";
I18N.en.dodTails = "TAILS";
I18N.en.dodPot = "pot: {n}";
I18N.en.dodRound = "flip {n} of 8";
I18N.en.dodResult = "{s}! pot is now {n}!";
I18N.en.dodBusted = "{s}... busted! you lose {n}";
I18N.en.dodCash = "cash out {n}";
I18N.en.dodCashed = "cashed out {n} points!";
I18N.en.dodMax = "8 straight calls - maxed out! you take {n}!";
I18N.en.typeName = "Typing Speed";
I18N.en.typeDesc = "secret: type this, fast";
I18N.en.typeRule = "type the line exactly as shown. 45+ words per minute = 60 points!";
I18N.en.typePlaceholder = "start typing here...";
I18N.en.typeResult = "{n} WPM in {s} seconds!";
I18N.pl.seqName = "Sekwencja";
I18N.pl.seqDesc = "powtórz migający wzór";
I18N.pl.seqRule = "oglądaj migający wzór, potem powtórz go przyciskami. jeden błąd i koniec!";
I18N.pl.seqIdle = "naciśnij start kiedy gotowy";
I18N.pl.seqWatch = "oglądaj...";
I18N.pl.seqTurn = "twój ruch - powtórz!";
I18N.pl.seqRound = "runda {n}";
I18N.pl.seqFail = "błąd! przeżyłeś {n} rund.";
I18N.pl.slotName = "Automat";
I18N.pl.slotDesc = "tajne: trzy bębny, jedna dźwignia";
I18N.pl.slotRule = "dopasuj bębny: trójka płaci 5x stawki, para zwraca 2x.";
I18N.pl.slotSpin = "POCIĄGNIJ DŹWIGNIĘ";
I18N.pl.slotTriple = "TRÓJKA!";
I18N.pl.slotPair = "para!";
I18N.pl.slotWin = "+{n} punktów!";
I18N.pl.slotLose = "brak pary - {n} punktów przepadło";
I18N.pl.slotFree = "(gra za darmo - bez nagrody)";
I18N.pl.dodName = "Podwój albo Nic";
I18N.pl.dodDesc = "tajne: zgaduj monetę, wypłać dużą kasę";
I18N.pl.dodRule = "trafnie zgadnij monetę, a pula się podwaja. jeden zły strzał i tracisz wszystko. wypłać kiedy chcesz, max 8 rzutów!";
I18N.pl.dodHeads = "RESZKA";   /* polish: orzel/reszka - call is heads/tails anyway */
I18N.pl.dodTails = "ORZEŁ";
I18N.pl.dodPot = "pula: {n}";
I18N.pl.dodRound = "rzut {n} z 8";
I18N.pl.dodResult = "{s}! pula to teraz {n}!";
I18N.pl.dodBusted = "{s}... przegrana! tracisz {n}";
I18N.pl.dodCash = "wypłać {n}";
I18N.pl.dodCashed = "wypłacono {n} punktów!";
I18N.pl.dodMax = "8 trafnych z rzędu - maksimum! bierzesz {n}!";
I18N.pl.typeName = "Szybkość Pisania";
I18N.pl.typeDesc = "tajne: przepisz to, szybko";
I18N.pl.typeRule = "przepisz zdanie dokładnie tak, jak jest. 45+ słów na minutę = 60 punktów!";
I18N.pl.typePlaceholder = "zacznij pisać tutaj...";
I18N.pl.typeResult = "{n} SPM w {s} sekundach!";

I18N.en.wamName = "Whack-a-Mole";
I18N.en.wamDesc = "bop the mole before it escapes";
I18N.en.wamRule = "click the mole the moment it pops up! 3 escapes and the game ends.";
I18N.en.wamStart = "start bopping";
I18N.en.wamLine = "score {n} - escapes {m}/3";
I18N.en.wamOver = "the mole got away 3 times - you whacked {n}!";
I18N.en.mmName = "Mastermind";
I18N.en.mmDesc = "secret: crack the 4-digit code";
I18N.en.mmRule = "crack the hidden code (4 different digits, 1-8) in 10 tries. A = right digit right spot, B = right digit wrong spot.";
I18N.en.mmGuess = "GUESS";
I18N.en.mmFb = "{g} -> {a}A {b}B";
I18N.en.mmWin = "Cracked in {n} tries!";
I18N.en.mmLose = "Out of tries - the code was {c}.";
I18N.en.mmBad = "need 4 DIFFERENT digits from 1 to 8";
I18N.en.mmLeft = "tries left: {n}";
I18N.en.hanoiName = "Tower of Hanoi";
I18N.en.hanoiDesc = "secret: move the whole stack to peg C";
I18N.en.hanoiRule = "move the stack to peg C - a bigger disc can never sit on a smaller one.";
I18N.en.hanoiHelp = "click a peg to pick its top disc, click another peg to drop";
I18N.en.hanoiWin = "Solved in {n} moves!";
I18N.en.hanoiIll = "illegal move - bigger disc can't go on a smaller one";
I18N.en.plName = "Plinko";
I18N.en.plDesc = "secret: drop the chip, pray for the 3x";
I18N.en.plRule = "drop the chip down the pegs: 0x = lose all, 0.5x = half back, 1x = push, 3x = JACKPOT!";
I18N.en.plDrop = "DROP THE CHIP";
I18N.en.plJack = "3x JACKPOT! +{n} points!";
I18N.en.plHalf = "{n} points back";
I18N.en.plPush = "1x - stake back";
I18N.en.plGone = "0x - your stake is gone";
I18N.en.plFree = "(free play - no prize)";
I18N.pl.wamName = "Kret";
I18N.pl.wamDesc = "traf kreta zanim ucieknie";
I18N.pl.wamRule = "kliknij kreta, gdy wyskoczy! 3 ucieczki i koniec gry.";
I18N.pl.wamStart = "zaczynaj";
I18N.pl.wamLine = "wynik {n} - ucieczki {m}/3";
I18N.pl.wamOver = "kret uciekł 3 razy - trafiłeś {n}!";
I18N.pl.mmName = "Mastermind";
I18N.pl.mmDesc = "tajne: złam 4-cyfrowy kod";
I18N.pl.mmRule = "złam ukryty kod (4 różne cyfry, 1-8) w 10 próbach. A = dobra cyfra i dobre miejsce, B = dobra cyfra i złe miejsce.";
I18N.pl.mmGuess = "PRÓBA";
I18N.pl.mmFb = "{g} -> {a}A {b}B";
I18N.pl.mmWin = "Złamany w {n} próbach!";
I18N.pl.mmLose = "Koniec prób - kod to {c}.";
I18N.pl.mmBad = "potrzebne 4 RÓŻNE cyfry od 1 do 8";
I18N.pl.mmLeft = "próby pozostały: {n}";
I18N.pl.hanoiName = "Wieża Hanoi";
I18N.pl.hanoiDesc = "tajne: przenieś cały stos na słupek C";
I18N.pl.hanoiRule = "przenieś stos na słupek C - większy krążek nigdy nie leży na mniejszym.";
I18N.pl.hanoiHelp = "kliknij słupek, żeby wziąć górny krążek, potem kliknij słupek docelowy";
I18N.pl.hanoiWin = "Rozwiązane w {n} ruchach!";
I18N.pl.hanoiIll = "nielegalny ruch - większy krążek nie może leżeć na mniejszym";
I18N.pl.plName = "Plinko";
I18N.pl.plDesc = "tajne: upuść żeton i licz na 3x";
I18N.pl.plRule = "upuść żeton: 0x = wszystko przepadło, 0.5x = połowa z powrotem, 1x = push, 3x = JACKPOT!";
I18N.pl.plDrop = "UPUŚĆ ŻETON";
I18N.pl.plJack = "JACKPOT 3x! +{n} punktów!";
I18N.pl.plHalf = "{n} punktów z powrotem";
I18N.pl.plPush = "1x - stawka wraca";
I18N.pl.plGone = "0x - stawka przepadła";
I18N.pl.plFree = "(gra za darmo - bez nagrody)";

I18N.en.loName = "Lights Out";
I18N.en.loDesc = "flip them all off";
I18N.en.loRule = "clicking a light flips it AND its neighbours. turn every light off!";
I18N.en.loMoves = "moves: {n}";
I18N.en.loWin = "All lights out in {n} moves!";
I18N.en.swName = "Word Scramble";
I18N.en.swDesc = "unscramble the word";
I18N.en.swRule = "unscramble the word - 3 tries per word, a solved word pays 30 points!";
I18N.en.swWrong = "not quite - {n} tries left";
I18N.en.swWin = "That's it - {w}!";
I18N.en.swLose = "out of tries - it was {w}";
I18N.en.stName = "Star Catcher";
I18N.en.stDesc = "catch the falling stars";
I18N.en.stRule = "move with A/D or arrow keys. catch stars, 3 escapes = game over. 5 points per star!";
I18N.en.stLine = "stars {n} - escapes {m}/3";
I18N.en.stOver = "you caught {n} stars!";
I18N.en.lrName = "Lucky Race";
I18N.en.lrDesc = "bet on a runner - pays 3:1";
I18N.en.lrRule = "pick your runner, watch the chaos. first to the finish wins! your runner pays 3:1.";
I18N.en.lrWin = "Runner {n} wins! +{k} points!";
I18N.en.lrLose = "Runner {n} wins - you lose {b} points";
I18N.en.lrFree = "Runner {n} wins! (free play)";
I18N.en.boName = "Breakout";
I18N.en.boDesc = "smash every brick";
I18N.en.boRule = "move the paddle with A/D, arrows or the buttons. 3 balls - clear the whole wall!";
I18N.en.boLine = "balls: {n} - bricks left: {m}";
I18N.en.boWin = "Wall cleared!";
I18N.en.boLose = "Out of balls!";
I18N.pl.loName = "Zgaś Światła";
I18N.pl.loDesc = "zgaś wszystkie";
I18N.pl.loRule = "kliknięcie światła odwraca je ORAZ sąsiadów. zgaś wszystkie!";
I18N.pl.loMoves = "ruchy: {n}";
I18N.pl.loWin = "Wszystko zgaszone w {n} ruchach!";
I18N.pl.swName = "Pomieszane Litery";
I18N.pl.swDesc = "ułóż literki";
I18N.pl.swRule = "ułóż słowo - 3 próby na słowo, każde słowo warte 30 punktów!";
I18N.pl.swWrong = "nie to - zostało {n} prób";
I18N.pl.swWin = "To to - {w}!";
I18N.pl.swLose = "koniec prób - to było {w}";
I18N.pl.stName = "Łowca Gwiazdek";
I18N.pl.stDesc = "łap spadające gwiazdki";
I18N.pl.stRule = "steruj A/D lub strzałkami. łap gwiazdki, 3 ucieczki = koniec. 5 punktów za gwiazdkę!";
I18N.pl.stLine = "gwiazdki {n} - ucieczki {m}/3";
I18N.pl.stOver = "złapałeś {n} gwiazdek!";
I18N.pl.lrName = "Szczęśliwy Wyścig";
I18N.pl.lrDesc = "postaw na biegacza - płaci 3:1";
I18N.pl.lrRule = "wybierz biegacza i oglądaj chaos. pierwszy na mecie wygrywa! twój biegacz płaci 3:1.";
I18N.pl.lrWin = "Biegacz {n} wygrywa! +{k} punktów!";
I18N.pl.lrLose = "Biegacz {n} wygrywa - tracisz {b} punktów";
I18N.pl.lrFree = "Biegacz {n} wygrywa! (za darmo)";
I18N.pl.boName = "Breakout";
I18N.pl.boDesc = "rozwal wszystkie cegły";
I18N.pl.boRule = "poruszaj paletką A/D, strzałkami lub przyciskami. 3 piłki - zniszcz całą ścianę!";
I18N.pl.boLine = "piłki: {n} - cegły: {m}";
I18N.pl.boWin = "Ściana rozbita!";
I18N.pl.boLose = "Koniec piłek!";

I18N.en.peName = "Penalty Shootout";
I18N.en.peDesc = "score more than the machine";
I18N.en.peRule = "5 kicks each way. match the keeper's side to SAVE, otherwise GOAL. best score after 5+5 shots wins 60 points!";
I18N.en.peL = "LEFT";
I18N.en.peC = "CENTER";
I18N.en.peR = "RIGHT";
I18N.en.peGoal = "GOAL!";
I18N.en.peSaved = "SAVED!";
I18N.en.peStatus = "{a} - {b}  (round {r}/5)";
I18N.en.peWin = "You win {a}-{b}!";
I18N.en.peLose = "You lose {a}-{b}.";
I18N.en.peTie = "Draw {a}-{b}!";
I18N.en.knName = "Lotto";
I18N.en.knDesc = "pick 5, pray to the draw";
I18N.en.knRule = "5 numbers (1-20) + a stake. the draw picks 10: 3 matches = 2x, 4 = 6x, 5 = 25x!";
I18N.en.knPicked = "selected {n}/5";
I18N.en.knNeed = "pick exactly 5 different numbers (1-20)";
I18N.en.knDraw = "DRAW!";
I18N.en.knDrawn = "drawn: {n}";
I18N.en.knWin = "+{n} points! ({m} matches)";
I18N.en.knLose = "only {m} matches - {b} points gone";
I18N.en.nimName = "Matchsticks";
I18N.en.nimDesc = "beat the machine at 21";
I18N.en.nimRule = "take 1-3 each turn - whoever takes the LAST one WINS. the machine plays perfectly, good luck :)";
I18N.en.nimLeft = "sticks left: {n}";
I18N.en.nimYou = "you take {n} - {m} left";
I18N.en.nimAi = "machine takes {n} - {m} left";
I18N.en.nimWin = "You took the last one!";
I18N.en.nimLose = "The machine took the last one.";
I18N.en.dcName = "Depth Charge";
I18N.en.dcDesc = "hunt the submarine";
I18N.en.dcRule = "a 3-cell submarine hides in the 8x8 grid. 12 shots. X = hit, . = miss. sink it for 70 points!";
I18N.en.dcLeft = "shots left: {n}";
I18N.en.dcHit = "HIT!";
I18N.en.dcMiss = "miss";
I18N.en.dcWin = "Submarine sunk with {n} shots left!";
I18N.en.dcLose = "Out of shots - it got away.";
I18N.en.p15Name = "15 Puzzle";
I18N.en.p15Desc = "slide the tiles into order";
I18N.en.p15Rule = "click a tile next to the empty space to slide it. get them in order 1 to 15!";
I18N.en.p15Moves = "moves: {n}";
I18N.en.p15Win = "Solved in {n} moves!";
I18N.en.p15Ill = "that tile is not next to the empty space";
I18N.pl.peName = "Karny";
I18N.pl.peDesc = "strzel więcej od maszyny";
I18N.pl.peRule = "5 strzałów w obie strony. zgodna strona = obrona, inna = gol. wyższy wynik po 5+5 strzałach wygrywa 60 punktów!";
I18N.pl.peL = "LEWO";
I18N.pl.peC = "ŚRODEK";
I18N.pl.peR = "PRAWO";
I18N.pl.peGoal = "GOL!";
I18N.pl.peSaved = "OBRONIONY!";
I18N.pl.peStatus = "{a} - {b}  (runda {r}/5)";
I18N.pl.peWin = "Wygrywasz {a}-{b}!";
I18N.pl.peLose = "Przegrywasz {a}-{b}.";
I18N.pl.peTie = "Remis {a}-{b}!";
I18N.pl.knName = "Lotto";
I18N.pl.knDesc = "wybierz 5, módl się o losowanie";
I18N.pl.knRule = "5 liczb (1-20) + stawka. losowanie wybiera 10: 3 trafienia = 2x, 4 = 6x, 5 = 25x!";
I18N.pl.knPicked = "wybrano {n}/5";
I18N.pl.knNeed = "wybierz dokładnie 5 różnych liczb (1-20)";
I18N.pl.knDraw = "LOSUJ!";
I18N.pl.knDrawn = "wylosowano: {n}";
I18N.pl.knWin = "+{n} punktów! ({m} trafień)";
I18N.pl.knLose = "tylko {m} trafień - {b} punktów przepadło";
I18N.pl.nimName = "Zapałki";
I18N.pl.nimDesc = "pokonaj maszynę w 21";
I18N.pl.nimRule = "bierz 1-3 co turę - ten, kto weźmie OSTATNIĄ, WYGRYWA. maszyna gra perfekcyjnie, powodzenia :)";
I18N.pl.nimLeft = "zostało zapałek: {n}";
I18N.pl.nimYou = "bierzesz {n} - zostało {m}";
I18N.pl.nimAi = "maszyna bierze {n} - zostało {m}";
I18N.pl.nimWin = "Wziąłeś ostatnią!";
I18N.pl.nimLose = "Maszyna wzięła ostatnią.";
I18N.pl.dcName = "Głęboka Bomba";
I18N.pl.dcDesc = "poluj na okręt";
I18N.pl.dcRule = "podwodny okręt (3 pola) kryje się w siatce 8x8. 12 strzałów. X = trafienie, . = pudło. zatop go za 70 punktów!";
I18N.pl.dcLeft = "pozostało strzałów: {n}";
I18N.pl.dcHit = "TRAFIENIE!";
I18N.pl.dcMiss = "pudło";
I18N.pl.dcWin = "Okręt zatopiony z {n} strzałami zapasowymi!";
I18N.pl.dcLose = "Koniec strzałów - uciekł.";
I18N.pl.p15Name = "Puzzle 15";
I18N.pl.p15Desc = "ułóż kafelki po kolei";
I18N.pl.p15Rule = "kliknij kafek obok pustego pola, żeby go przesunąć. ułóż je od 1 do 15!";
I18N.pl.p15Moves = "ruchy: {n}";
I18N.pl.p15Win = "Rozwiązane w {n} ruchach!";
I18N.pl.p15Ill = "ten kafek nie sąsiaduje z pustym polem";

I18N.en.itmCalc = "Calculator";
I18N.en.itmCalcD = "Math Quiz pays DOUBLE";
I18N.en.itmClock = "Alarm Clock";
I18N.en.itmClockD = "Daily bonus is doubled (100 instead of 50)";
I18N.en.itmPaddle = "Wide Paddle";
I18N.en.itmPaddleD = "Your Pong paddle is 50% wider";
I18N.en.itmDetector = "Metal Detector";
I18N.en.itmDetectorD = "Minesweeper reveals one mine at the start";
I18N.en.itmBall = "Extra Ball";
I18N.en.itmBallD = "Breakout starts with 4 balls instead of 3";
I18N.en.itmTip = "Racing Form";
I18N.en.itmTipD = "Lucky Race: your runner gets a head start";
I18N.en.raceTip = "tipster's tip: runner {n} looks fast this race!";
I18N.pl.itmCalc = "Kalkulator";
I18N.pl.itmCalcD = "Quiz Matematyczny płaci PODWÓJNIE";
I18N.pl.itmClock = "Budzik";
I18N.pl.itmClockD = "Dzienny bonus podwojony (100 zamiast 50)";
I18N.pl.itmPaddle = "Szeroka Paletka";
I18N.pl.itmPaddleD = "Twoja paletka w Pongu jest o 50% szersza";
I18N.pl.itmDetector = "Wykrywacz Metalu";
I18N.pl.itmDetectorD = "Saper pokazuje jedną minę na starcie";
I18N.pl.itmBall = "Dodatkowa Piłka";
I18N.pl.itmBallD = "Breakout zaczyna z 4 zamiast 3 piłek";
I18N.pl.itmTip = "Forma Wyścigowa";
I18N.pl.itmTipD = "Szczęśliwy Wyścig: twój biegacz ma forę";
I18N.pl.raceTip = "tipster mówi: biegacz {n} wygląda na szybkiego!";
