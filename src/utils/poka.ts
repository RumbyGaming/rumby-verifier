import keccak256 from "keccak256"
import MerkleTree from "merkletreejs";
import { cloneObj } from "./common";
import { RESULT_CURRENT_PLAYER_WIN, RESULT_DRAW } from "@/constants/poka";
import { PokaCard } from "@/components/types";
export const GOLD_CARD_VALUE = [52, 53];

// 54-card deck: 0–51 = normal cards, 52–53 = jokers
export const createDeck = (): number[] => Array.from({ length: 54 }, (_, i) => i)

// Deterministic shuffle (XOR of 2 x 16-byte slices)
export const shuffle = (deck: number[], seed: Buffer<ArrayBufferLike>): number[] => {
    const arr = [...deck]
    // const hash = keccak256(seed) // 32-byte buffer
    const hash = seed;

    // Extract two 16-byte parts
    const part1 = BigInt('0x' + hash.subarray(0, 16).toString('hex'))
    const part2 = BigInt('0x' + hash.subarray(16, 32).toString('hex'))

    // XOR both to get the final 128-bit seed
    let state = part1 ^ part2

    // LCG PRNG with 2^31 mask (same as Rust)
    const MASK = (1n << 31n) - 1n

    for (let i = arr.length - 1; i > 0; i--) {
      state = (state * 1103515245n + 12345n) & MASK
      const j = Number(state % BigInt(i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }

    return arr
}


export const getCardName = (cardNumber: number, suit: number) => {
    let cardName = "";
    let suitName = "";

    switch(cardNumber) {
        case 9:
            cardName = "J";
            break;

        case 10:
            cardName = "Q";
            break;

        case 11:
            cardName = "K";
            break;

        case 12:
            cardName = "A";
            break;

        default:
            cardName = (cardNumber + 2).toString();
            break;
    }

    switch(suit) {
        case 0:
            suitName = "♦";
            break;
        case 1:
            suitName = "♣";
            break;
        case 2:
            suitName = "♥";
            break;
        case 3:
            suitName = "♠";
            break;
    }

    return cardName + suitName;
}

export const getSuitName = (suit: number) => {
    switch(suit) {
        case 0:
            return "♦";

        case 1:
            return "♣";

        case 2:
            return "♥";

        case 3:
            return "♠";
    }

    return "";
}

export const getCardAndSuitFromNumber = (card: number) => {
    if(GOLD_CARD_VALUE.includes(card)) {
        return {
            cardValue: 15,
            suit: 1,
            name: "GOLD",
        }
    }
    const suit = card % 4; // 13 sets of card, remainer = suit, 0-3
    const cardValue = Math.floor(card / 4);  // 0-12

    return { cardValue, suit, name: getCardName(cardValue, suit) }
}

export const getHighestPokerCombinationV2 = (cards: number[]) => {
    const numberOfGoldCards = cards.filter(x => GOLD_CARD_VALUE.includes(x)).length;

    // almost auto win for 5 gold cards
    if(numberOfGoldCards === 5) {
        return {
            score: 100,
            comparators: [12],
            cards: [GOLD_CARD_VALUE[0], GOLD_CARD_VALUE[0], GOLD_CARD_VALUE[0], GOLD_CARD_VALUE[0], GOLD_CARD_VALUE[0]], // 5 gold cards for instant win (temporary hardcoded)
            name: "Royal Flush (GOLD)"
        };
    }

    const cardValues: number[] = [];
    const suits: number[] = [];
    const names: string[] = [];

    let isRoyalFlush = false;
    let isStraightFlush = false;
    let isFlush = false;
    let isStraight = false;

    let isFiveOfAKind = false;
    let isFourOfAKind = false;
    let isFullHouse = false;
    let isThreeOfAKind = false;
    let isTwoPair = false;
    let isPair = false;

    const cardCount: {
        [cardNumber: string]: number;
    } = {};

    const suitCount: {
        [suit: string]: {
            count: number;
            cards: number[];
            cardNumbers: number[];
        };
    } = {};

    const originalCardCount: {
        [cardNumber: string]: number;
    } = {};

    for(const card of cards) {
        if(GOLD_CARD_VALUE.includes(card)) continue;
        const { /* cardValue, suit,  */name } = getCardAndSuitFromNumber(card);
        names.push(name);
    }

    // from low to high
    cards = cards.sort();

    // find card values
    for(const card of cards) {
        if(GOLD_CARD_VALUE.includes(card)) continue;
        const { cardValue, suit, /* name */ } = getCardAndSuitFromNumber(card);
        cardValues.push(cardValue);

        suits.push(suit);
        // names.push(name);

        if(!cardCount[cardValue.toString()]) {
            cardCount[cardValue.toString()] = 0;
        }

        if(!suitCount[suit.toString()]) {
            suitCount[suit.toString()] = {
                count: 0,
                cards: [],
                cardNumbers: [],
            };
        }

        if(!originalCardCount[card.toString()]) {
            originalCardCount[card.toString()] = 0;
        }

        cardCount[cardValue.toString()]++;
        suitCount[suit.toString()].count++;
        suitCount[suit.toString()].cards.push(cardValue);
        suitCount[suit.toString()].cardNumbers.push(card);
        originalCardCount[card.toString()]++;
    }

    // find straight flush
    const straightFlushCardSets: number[][] = [];

    // iterate to get all the potential straight flushes
    for(const [card, /* count */] of Object.entries(originalCardCount)) {
        let cardNumber = Number(card);
        const originalCardNumber = Number(card);
        const straightFlushCardSet: number[] = [];

        // if it's ace, we find A - 4
        // ace card number from -4 to -1
        if(cardNumber >= 48) {
            cardNumber -= 52;
        }

        straightFlushCardSet.push(originalCardNumber);

        // find next 4 numbers
        for(let i = 1; i <= 4; i++) {
            // * 4 cause that's the next card with the same suit
            // eg, 0 = 2 diamond
            // 4 = 3 diamond
            if(originalCardCount[(cardNumber + (i * 4)).toString()]) {
                straightFlushCardSet.push(cardNumber + (i * 4));
            }
        }

        straightFlushCardSets.push(straightFlushCardSet);
    }

    let straightFlushHighCard = -10;
    let straightFlushCards: number[] = [];
    // let straightFlushSuit = -1;
    // iterate to check if the potential straight flushes satisfy the conditions
    for(const cardSet of straightFlushCardSets) {
        // gold cards / wildcards can fill in any blanks
        if(cardSet.length === 5 || cardSet.length + numberOfGoldCards >= 5) {
            isStraightFlush = true;

            // + 16 cause that's the high card
            const { cardValue: highCardValue, /* suit */ } = getCardAndSuitFromNumber(cardSet[0] + 16);
            const { cardValue: lowCardValue } = getCardAndSuitFromNumber(cardSet[0]);

            // straightFlushSuit = suit;

            // low card is 10 and card set + gold card is 5, means it's royal flush
            if(lowCardValue >= 8) {
                isRoyalFlush = true;
                straightFlushCards = cloneObj(cardSet);
                straightFlushCards.sort((a,b) => a > b? -1 : 1);
            }

            // gold card placement doesn't matter cause we're always taking the highest card value
            else if(straightFlushHighCard < highCardValue) {
                straightFlushHighCard = highCardValue;
                straightFlushCards = cloneObj(cardSet);
                straightFlushCards.sort((a,b) => a > b? -1 : 1);
            }
        }
    }

    // straight flush high card 12 = ace, meaning it's a straight from 10 to A
    // check again for royal flush
    if((isStraightFlush && straightFlushHighCard === 12)) {
        isRoyalFlush = true;
    }

    // find flush
    // const flushHighCard = -2;
    let flushCards: number[] = [];
    let flushCardNumbers: number[] = [];
    // let flushSuit = -1;
    for(const [/* suit */, {count, cards, cardNumbers}] of Object.entries(suitCount)) {
        if(count + numberOfGoldCards < 5) {
            continue;
        }

        isFlush = true;
        // flushSuit = Number(suit);

        // sort by card value to get highest -> lowest
        const sorted = cards.sort((a,b) => a > b? -1 : 1);
        // let currentHighCard = sorted[0];
        flushCardNumbers = cardNumbers;
        flushCards = sorted;
    }

    if(isFlush && numberOfGoldCards > 0) {
        for(let i = 0; i < numberOfGoldCards; i++) {
            flushCards.pop();
            flushCards.unshift(12); // get the highest ranks in the first n cards
        }
    }

    // remove cards if more than 5 cards to not compare more than necessary
    if(flushCards.length > 5) {
        for(let i = 0; i < flushCards.length - 5; i++) {
            flushCards.pop();
        }
    }

    let entries = Object.entries(cardCount);
    // sort by count
    // cause we want to find the highest multiple of cards, eg, four of a kind
    entries = entries.sort((a,b) => {
        // if count is the same
        // sort by card value
        if(a[1] === b[1]) {
            return Number(a[0]) > Number(b[0])? -1 : 1;
        }

        // sort by card value to get highest -> lowest
        return a[1] > b[1]? -1 : 1;
    });

    let comparators: number[] = [];
    let previousCard: number = -2;

    // find straight sets
    const straightCardSets: number[][] = [];
    for(const [card, /* count */] of entries) {
        let cardNumber = Number(card);

        // if it's ace, we find A - 4
        // card number from -1 to 3
        if(cardNumber === 12) {
            cardNumber = -1;
        }

        const straightCardSet: number[] = [];
        straightCardSet.unshift(cardNumber);

        // find next 4 numbers
        for(let i = 1; i <= 4; i++) {
            if(cardCount[(cardNumber + i).toString()]) {
                // lowest first
                straightCardSet.push(cardNumber + i);
            }
        }

        straightCardSets.push(straightCardSet);
    }

    let straightHighCard: number = -2;
    let straightCards: number[] = [];
    // iterate to check if the potential straight straights satisfy the conditions
    for(const cardSet of straightCardSets) {
        // gold cards / wildcards can fill in any blanks
        if(cardSet.length === 5 || cardSet.length + numberOfGoldCards >= 5) {
            isStraight = true;

            // + 4 cause that's the high card
            const highCardValue = cardSet[0] + 4;
            if(straightHighCard < highCardValue) {
                straightHighCard = highCardValue;
                straightCards = cloneObj(cardSet);
                straightCards.sort((a,b) => a > b? -1 : 1);
            }
        }
    }

    let hasUsedCard = false;
    for(const [card, count] of entries) {
        const cardNumber = Number(card);

        let rankDetermined = false; // make sure we dont process a card twice
        if((count + numberOfGoldCards) >= 5) {
            isFiveOfAKind = true;
            hasUsedCard = true;
            comparators.push(cardNumber);
            rankDetermined = true;
        }

        if((count === 4 && !rankDetermined)|| ((count + numberOfGoldCards) === 4 && !hasUsedCard)) {
            isFourOfAKind = true;
            hasUsedCard = true;
            comparators.push(cardNumber);
            rankDetermined = true;
        }


        if((count === 3 && !rankDetermined) || ((count + numberOfGoldCards) === 3 && !hasUsedCard)) {
            isThreeOfAKind = true;
            hasUsedCard = true;
            comparators.push(cardNumber);
            rankDetermined = true;
        }

        // dont need to check wildcard for this cause 3 of a kind is > 2 pairs
        if(isPair && count === 2) {
            isTwoPair = true;
            if(previousCard < cardNumber) {
                // if previous card lower than current card, we push the current comparator to the front
                comparators.unshift(cardNumber);
            }

            else {
                // if previous card higher than current card, we push the current comparator to the back
                comparators.push(cardNumber);
            }
        }

        else if((count === 2 && !rankDetermined) || ((count + numberOfGoldCards) === 2 && !hasUsedCard)) {
            isPair = true;
            hasUsedCard = true;
            rankDetermined = true;
            comparators.push(cardNumber);
        }

        if(isThreeOfAKind && isPair) {
            isFullHouse = true;
            // the pair is always the second comparator
            comparators.push(cardNumber);
        }

        if(count === 1 && !rankDetermined) {
            // always the last
            comparators.push(cardNumber);
        }

        // logger.info({cardNumber, count})
        previousCard = cardNumber;
    }

    // high card
    if(!isFiveOfAKind && !isFourOfAKind && !isThreeOfAKind && !isPair && comparators.length > 5) {
        // rearrange comparators by descending order
        comparators = comparators.sort((a,b) => a > b? -1 : 1);
        comparators = comparators.filter((x, index) => index < 5);
    }

    // if there are gold cards, comparators for straight and straight flushes will be wrong due to missing numbers
    if((isStraight || isStraightFlush) && numberOfGoldCards > 0) {
        const missingCards: number[] = [];
        let isMissingMiddle = false;
        const highCard = straightCards[0]; // always sorted from high to low
        for(let i = 1; i < 5 - numberOfGoldCards; i++) {
            if(!straightCards.includes(highCard - i)) {
                isMissingMiddle = true;
                missingCards.push(highCard - i);
            }
        }

        // refill missing
        if(isMissingMiddle) {
            straightCards.push(...missingCards);
        }

        // it's not middle
        // A is high card, so we fill the bottom
        else if(highCard === 12) {
            // if 12 with 1 gold card
            // then starts at 12 - (5 - 1) = 8
            // becomes 12,11,10,9,8
            let bottomStart = highCard - (5 - numberOfGoldCards);
            for(let i = 0; i < numberOfGoldCards; i++) {
                straightCards.push(bottomStart);
                bottomStart--;
            }
        }

        // high card is not 12
        // so we have to increment
        else {
            for(let i = 1; i <= numberOfGoldCards; i++) {
                let card = highCard + i;

                // this happens when there are more than 1 gold cards
                if(card > 12) {
                    // eg, if it's 13, it becomes 8
                    // 12*, 11, 10, 9, 8*
                    // * = with gold card
                    card = card - 5;
                }

                straightCards.push(card);
            }
        }

        straightCards.sort((a,b) => a > b? -1 : 1);
    }

    // royal flush
    if(isRoyalFlush) {
        return {
            score: 100,
            comparators: [12],
            cards: straightFlushCards,
            name: "Royal Flush"
        };
    }

    if(isFiveOfAKind) {
        const winningCards = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[0];
        });

        return {
            score: 99,
            comparators: [
                comparators[0]
            ],
            cards: winningCards,
            name: "Five of a Kind"
        };
    }

    // straight flush
    if(isStraightFlush) {
        return {
            score: 98,
            comparators: straightCards,
            cards: straightFlushCards,
            name: "Straight Flush"
        };
    }

    if(isFourOfAKind) {
        const winningCards = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[0];
        });

        const winningCard2 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[1];
        })[0];

        return {
            score: 97,
            comparators: [
                comparators[0],
                comparators[1]
            ],
            cards: [...winningCards, winningCard2],
            name: "Four of a Kind"
        };
    }

    if(isFullHouse) {
        const winningCards = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[0];
        });

        const winningCard2 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[1];
        });

        return {
            score: 96,
            comparators: [
                comparators[0],
                comparators[1]
            ],
            cards: [...winningCards, ...winningCard2],
            name: "Full House"
        };
    }

    if(isFlush) {
        return {
            score: 95,
            comparators: flushCards,
            cards: flushCardNumbers, // original numbers
            name: "Flush"
        };
    }

    if(isStraight) {
        const winningCards: number[] = [];

        for(let card of straightCards) {
            if(card < 0) card = 12;
            const winningCard = cards.filter(x => getCardAndSuitFromNumber(x).cardValue === card)[0];
            if(winningCard !== undefined) winningCards.push(winningCard);
        }

        return {
            score: 94,
            comparators: straightCards,
            cards: winningCards,
            name: "Straight"
        };
    }

    if(isThreeOfAKind) {
        const winningCards = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[0];
        });

        const winningCard2 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[1];
        })[0];

        const winningCard3 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[2];
        })[0];

        return {
            score: 93,
            comparators: [
                comparators[0],
                comparators[1],
                comparators[2]
            ],
            cards: [...winningCards, winningCard2, winningCard3],
            name: "Three of a Kind"
        };
    }

    if(isTwoPair) {
        const winningCards = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[0];
        });

        const winningCard2 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[1];
        });

        const winningCard3 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[2];
        })[0];

        return {
            score: 92,
            comparators: [
                comparators[0],
                comparators[1],
                comparators[2]
            ],
            cards: [...winningCards, ...winningCard2, winningCard3],
            name: "Two Pair"
        };
    }

    if(isPair) {
        const winningCards = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[0];
        });

        const winningCard2 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[1];
        })[0];

        const winningCard3 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[2];
        })[0];

        const winningCard4 = cards.filter(x => {
            return getCardAndSuitFromNumber(x).cardValue === comparators[3];
        })[0];

        return {
            score: 91,
            comparators: [
                comparators[0],
                comparators[1],
                comparators[2],
                comparators[3]
            ],
            cards: [...winningCards, winningCard2, winningCard3, winningCard4],
            name: "Pair"
        };
    }

    const winningCard1 = cards.filter(x => {
        return getCardAndSuitFromNumber(x).cardValue === comparators[0];
    })[0];

    const winningCard2 = cards.filter(x => {
        return getCardAndSuitFromNumber(x).cardValue === comparators[1];
    })[0];

    const winningCard3 = cards.filter(x => {
        return getCardAndSuitFromNumber(x).cardValue === comparators[2];
    })[0];

    const winningCard4 = cards.filter(x => {
        return getCardAndSuitFromNumber(x).cardValue === comparators[3];
    })[0];

    const winningCard5 = cards.filter(x => {
        return getCardAndSuitFromNumber(x).cardValue === comparators[4];
    })[0];

    return {
        score: 90,
        comparators: [
            comparators[0],
            comparators[1],
            comparators[2],
            comparators[3],
            comparators[4]
        ],
        cards: [winningCard1, winningCard2, winningCard3, winningCard4, winningCard5],
        name: "High Card"
    };
}

export const getCardCombinations = (hand: number[]) => {
    const combination: number[][] = [];
    for(let i = 0; i < hand.length; i++) {
        for(let j = i + 1; j < hand.length; j++) {
            combination.push([hand[i], hand[j]]);
        }
    }

    return combination;
}

export const getCommunityCardCombinations = (hand: number[]) => {
    const combination: number[][] = [];
    for(let i = 0; i < hand.length; i++) {
        for(let j = i + 1; j < hand.length; j++) {
            for(let k = j + 1; k < hand.length; k++) {
                combination.push([hand[i], hand[j], hand[k]]);
            }
        }
    }

    return combination;
}

export const getBestHandFromCardsV2 = (playerHand: number[], communityPool: number[]) => {
    let bestScore = 0; // scores
    let bestComparators = [0,0,0,0,0]; // card numbers
    let bestCards: number[] = []; // card values
    let bestName = "";

    const playerCombinations = getCardCombinations(playerHand);
    const communityPoolCombinations = getCommunityCardCombinations(communityPool);

    for(const p of playerCombinations) {
        for(const c of communityPoolCombinations) {
            const combination = [...p, ...c];
            if(combination.length < 5) continue; // failsafe

            const {
                score,
                // cards,
                comparators,
                name
            } = getHighestPokerCombinationV2(combination);

            // dont need to process this
            if(bestScore > score) {
                continue;
            }

            if(bestScore < score) {
                bestScore = score;
                bestCards = combination;
                bestComparators = comparators;
                bestName = name;
                continue;
            }

            // if score is the same
            // we compare
            for(let k = 0; k < 5; k++) {
                const currentSetComparator = comparators[k];
                const previousSetComparator = bestComparators[k];

                if(currentSetComparator < previousSetComparator) {
                    break;
                }

                // new high set
                if(currentSetComparator > previousSetComparator) {
                    bestScore = score;
                    bestCards = combination;
                    bestComparators = comparators;
                    bestName = name;
                    break;
                }
            }
        }
    }

    return {
        bestScore,
        bestComparators,
        bestCards,
        bestName,
    };
}

export const getWinner = (hand1: number[], hand2: number[]) => {
    for(let k = 0; k < 5; k++) {
        const score = hand1[k] as number;
        const secondScore = hand2[k] as number;
        if(secondScore > score) {
            // second hand win
            return 2;
        }

        if(score > secondScore) {
            // first hand win
            return 1;
        }
    }

    // tie
    return 0
}

// Converts card index + value into a consistent hash (matches Rust)
const toLeaf = (index: number, card: number, serverSeed: Buffer): Buffer => {
    const indexBuf = Buffer.alloc(4)
    indexBuf.writeUInt32BE(index)

    const cardBuf = Buffer.from([card]) // just 1 byte

    const combined = Buffer.concat([Uint8Array.from(indexBuf), Uint8Array.from(serverSeed), Uint8Array.from(cardBuf)])
    const hash = keccak256(combined)

    return hash
}


export const generateDeck = (combinedSeed: Buffer) => {

    const original = createDeck()
    const shuffled = shuffle(original, combinedSeed)
    const leaves = shuffled.map((card, i) => toLeaf(i, card, combinedSeed))
    const tree = new MerkleTree(leaves, keccak256, {
        sort: false,
        sortPairs: false,     // 🔴 CRITICAL
        sortLeaves: false,
    })

    const root = tree.getRoot()

    return { deck: shuffled, merkleRoot: root, leaves };
}

// Use SHA3/Keccak to combine: hash(server_seed + client1 + client2 + ...)
export const combineSeed = (serverSeed: Buffer, clientSeeds: Buffer[]): Buffer => {
    const combined = Buffer.concat([Uint8Array.from(serverSeed), ...clientSeeds.map(c => Uint8Array.from(c))])
    return keccak256(combined);
}


export const processRound = (serverDeck: PokaCard[], pokaFoldedPlayers: string[]) => {
    const communityFiltered = serverDeck.filter(x => x.player === "Community");
    if(communityFiltered.length === 0) return;
    let players = serverDeck.map(x => x.player).filter(x => !pokaFoldedPlayers.includes(x) && x !== "Community" && x !== "--");

    // get unique
    players = [...new Set(players)];
    const communityCards = communityFiltered.map(x => Number(x.card_number));

    let winners: string[] = []; // user ids
    const surviving: string[] = [];
    const eliminatedPlayerIds: string[] = [];

    // poker checking
    let bestCards: number[] = [];
    let bestComparators: number[] = [];
    let bestScore = 0;
    let bestName: string = "";

    if(players.length === 0) {
        // return default
        return {
            winners: [],
            bestCombination: bestName,
            eliminatedPlayerIds,
            currentBestHand: bestCards,
            winningCards: bestScore,
            surviving,
            playersEliminated: 0
        };
    }

    // let communityCardNames = "";
    // communityCards.forEach(c => {
    //     let cardName = GOLD_CARD_VALUE.includes(c) ? "GOLD" : getCardAndSuitFromNumber(c).name;
    //     communityCardNames += `${cardName} `
    // });

    // get highest hand
    for(const player of players) {
        const filtered = serverDeck.filter(x => x.player === player);
        if(filtered.length === 0) continue;

        // get the cards
        const playerCards = filtered.map(x => Number(x.card_number));

        // let playerCardNames = "";
        // playerCards.forEach(c => {
        //     let cardName = GOLD_CARD_VALUE.includes(c) ? "GOLD" : getCardAndSuitFromNumber(c).name;
        //     playerCardNames += `${cardName} `
        // });

        const {
            bestScore: currentBestScore,
            bestCards: currentBestCards,
            bestComparators: currentBestComparators,
            bestName: currentBestName,
        } = getBestHandFromCardsV2(playerCards, communityCards);

        if(bestScore > currentBestScore) {
            // current player lost to previous player
            eliminatedPlayerIds.push(player);
            continue;
        }

        if(bestScore < currentBestScore) {
            // current player is the winner

            // eliminate all previous winners
            for(const winner of winners) {
                eliminatedPlayerIds.push(winner);
            }


            winners = [player];
            bestScore = currentBestScore;
            bestCards = currentBestCards;
            bestComparators = currentBestComparators;
            bestName = currentBestName;
            continue;
        }

        // tied in hierachy
        // so we have to compare
        const winIndex = getWinner(currentBestComparators, bestComparators);
        if(winIndex === RESULT_DRAW) {
            // tie
            winners.push(player);
            bestCards.push(...currentBestCards); // make sure all cards are in the best cards array
            bestCards = [...new Set(bestCards)]; // remove duplicates
            continue;
        }

        // need some explaination here =\
        if(winIndex === RESULT_CURRENT_PLAYER_WIN) {
            // eliminate all previous
            for(const winner of winners) {
                eliminatedPlayerIds.push(winner);
            }

            // current player is the winner
            winners = [player];
            bestScore = currentBestScore;
            bestCards = currentBestCards;
            bestComparators = currentBestComparators;
            bestName = currentBestName;
            continue;
        }

        // win index === RESULT_CURRENT_PLAYER_LOSE by default
        eliminatedPlayerIds.push(player);
    }

    return {
        winners,
        eliminatedPlayerIds,
        playersEliminated: eliminatedPlayerIds.length,
        bestCards,
        bestComparators,
        bestName,
        bestScore,
    };
}