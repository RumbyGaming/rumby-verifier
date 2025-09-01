export enum RouletteOutcome {
    Jackpot = 0,
    Yellow = 1,
    Blue = 2,
    Yellow3 = 3,
    Blue4 = 4,
    Yellow5 = 5,
    Blue6 = 6,
    Yellow7 = 7,
    Blue8 = 8,
    Yellow9 = 9,
    Blue10 = 10,
    Yellow11 = 11,
    Blue12 = 12,
    Yellow13 = 13,
    Blue14 = 14
}

export enum RouletteBet {
    Jackpot = 0,
    Yellow = 1,
    Blue = 2,
    Pattern = 3,
};

export const ROULETTE_RANGES = [
    [0], // jackpot
    [1,3,5,7,9,11,13], // yellow
    [2,4,6,8,10,12,14], // blue
    [7,14], // pattern
];

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;