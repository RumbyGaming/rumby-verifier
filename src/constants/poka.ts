export enum PokerAction {
    Check = 0,
    Fold = 1,
    AutoFold = 2,
    PreFlop = 3,
    Call = 4,
    Raise = 5,
    AllIn = 6,
    BigBlind = 7,
    SmallBlind = 8,
    NormalCard = 9,
    MysteryCard = 10,
    SitIn = 11,
    CommunityCard = 12
};

export const RESULT_DRAW = 0;
export const RESULT_CURRENT_PLAYER_WIN = 1;
export const RESULT_CURRENT_PLAYER_LOSE = 2;