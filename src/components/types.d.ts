export type Record =  {
    player: string;
    amount: string;
    bet_range_start: string;
    bet_range_end: string;
    created_tx: string;
    choice: string;
    is_winner: boolean;
};

export type Data = {
    created_tx: string;
    committed_tx: string;
    result_txs: string[];
    server_seed: string;
    hashed_server_seed: string;
    public_seed: string;
    public_seed_block_height: string;
    random_number_revealed: string;
    total_amount: string;
    current_slot: string;
    records: Record[];
    otherWinnerTxs: string[];
}

export type PokaRecord =  {
    player: string;
    amount: string;
    poka_action: string;
    status: string;
    created_tx: string;
    card_index: string;
};

export type PokaCard = {
    card_number: string;
    card_index: string;
    label: string;
    player: string;
}

export type PokaData = {
    match_created_tx: string;
    round_created_tx: string;
    committed_tx: string;
    result_tx: string;
    server_seed: string;
    hashed_server_seed: string;
    client_seeds: string[];
    total_amount: string;
    current_slot: string;
    deck: PokaCard[];
    records: PokaRecord[];
}