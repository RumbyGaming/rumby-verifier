'use client';

import { HistoryTable } from "@/components/app/provably_fair/HistoryTable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from '@/services/axios';
import { History } from "../types";

const DATA_PER_PAGE = 10;
const Page = () => {
    const [histories, setHistories] = useState<History[]>([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const hasInit = useRef(false);

    const maxPage = useMemo(() => {
        return Math.floor(count / DATA_PER_PAGE);
    }, [count]);

    const getData = useCallback(async(page = 0) => {
        if(isLoading) return;
        try {
            setIsLoading(true);
            const res = await axios.get<History[]>(`/poka/page/${page}`);
            setHistories(res.data);
        }

        catch {
            // do nothing
        }
        setIsLoading(false);
    }, [isLoading]);

    const onLeftClick = useCallback(() => {
        if(isLoading) return;
        const newPage = page - 1;
        if(newPage < 0) {
            return;
        }

        setPage(newPage);
        getData(newPage);
    }, [isLoading, page, getData]);

    const onRightClick = useCallback(() => {
        if(isLoading) return;
        const newPage = page + 1;
        if(newPage > maxPage) {
            return;
        }

        setPage(newPage);
        getData(newPage);
    }, [isLoading, page, maxPage, getData]);

    const getCount = useCallback(async() => {
        try {
            const res = await axios.get<string>("/poka/count");
            setCount(Number(res.data));
        }

        catch {
            // do nothing
        }
    }, []);

    useEffect(() => {
        if(hasInit.current) return;
        hasInit.current = true;
        getData();
        getCount();
    }, [getData, getCount]);

	return (
		<div className="flex flex-col w-full">
			
			<div className="flex flex-col text-white">
                <strong>Poka Details</strong>
                <span className="mt-[10px]">{`All Rumby games are fair and transparent, with every detail recorded and executed through a smart contract. Because these details exist on-chain, their fairness can be easily verified.`}</span>
                <span className="mt-[10px]">{`Here's how Rumby Poka works:`}</span>
                <ul style={{ listStyle: "decimal" }} className="[&>*]:ml-[30px] mt-[10px] space-y-[20px]">
                    <li>
                        {`Each match consists of several game rounds. Both matches and game rounds are created on chain through Rumby's smart contract. The keccak256-hashed server seeds are stored in the game rounds' account states to prevent any future tampering.`}
                    </li>
                    <li>
                        {`The hashed server seed is disclosed to all participants and can be independently verified once the unhashed server seed is revealed upon the round's conclusion.`}
                    </li>
                    <li>{`If the player wishes to play the game, the player is first required to request to sit in.`}</li>
                    <li>
                        {`Once the required number of players has joined, each pays the sit-in fee, enters a game round, and submits their client seed, which is then used to shuffle the deck for that round.`}
                    </li>
                    <li>
                        {`A maximum of 6 players is allowed per game round.`}
                    </li>
                    <li>
                        {`The deck of a game round is generated through the following code:`}
                        <div className="p-[10px] bg-white/10 rounded">
                        <code className="whitespace-pre font-ibm text-[12px]">
                            {`const createDeck = (): number[] => Array.from({ length: 54 }, (_, i) => i)

const shuffle = (deck: number[], seed: Buffer<ArrayBufferLike>): number[] => {
    const arr = [...deck]
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

const generateDeck = (combinedSeed: Buffer) => {

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
}`}
                            </code>
                        </div>
                    </li>
                    <li>
                        {`The merkle tree created through the code is submitted on chain to verify the leaves' owners when the results are revealed.`}
                    </li>
                    <li>
                        {`Each number represents a card, where 0 = 2 of diamonds, 1 = 2 of clubs, 2 = 2 of hearts, 3 = 2 of spades, 4 = 3 of clubs...51 = ace of spaces.`}
                    </li>
                    <li>
                        {`Card numbers 52 and 53 represents GOLD cards.`}
                    </li>
                    <li>
                        {`Players are allowed to have a maximum of 5 cards per round, where 2 of them are distributed free of charge during the pre flop phase.`}
                    </li>
                    <li>
                        {`Players are only allowed to buy a maximum of 1 card per phase - which is during flop, turn, and river.`}
                    </li>
                    <li>
                        {`There are 2 types of cards that a player can buy, namely normal cards and mystery cards.`}
                        <ul style={{listStyle: "disc", marginLeft: 20}}>
                            <li>
                                {`Normal cards are standard draws and are not eligible to receive GOLD cards.`}
                            </li>
                            <li>
                                {`Mystery cards may contain GOLD cards, but their value remains concealed until the game round concludes and the reveal takes place.`}
                            </li>
                        </ul>
                    </li>
                    <li>
                        {`A player can only buy a maximum of 1 mystery card per round.`}
                    </li>
                    <li>
                        {`Should the next card in the deck be a GOLD card when a normal card transaction is created, the next non-GOLD card will be issued to the player instead.`}
                    </li>
                    <li>
                        {`If a GOLD card is skipped through the above condition, the next player who buys a mystery card will get the GOLD card.`}
                    </li>
                    <li>
                        {`Community card pools will never contain GOLD cards.`}
                    </li>
                    <li>
                        {`Each purchase is executed as an on-chain transaction, safeguarded by the smart contract to ensure players cannot exceed the permitted purchase limit.`}
                    </li>
                    <li>
                        {`When a player wins a game round, they advance to the next round. This process continues until only one player remains.`}
                    </li>
                    <li>
                        {`Each player is allowed to fold twice per match. Folds give the players a free pass to the next round.`}
                    </li>
                    <li>
                        {`Each fold is executed as an on-chain transaction, safeguarded by the smart contract to ensure players cannot exceed the permitted fold limit.`}
                    </li>
                    <li>
                        {`The last player wins the accumulated prize pool.`}
                    </li>
                    <li>
                        {`The unhashed server seed is subsequently published on-chain together with the payout distribution.`}
                    </li>
                </ul>
            </div>
            <div 
                className="h-[1px] w-full self-center my-[50px]"
                style={{
                    background: "linear-gradient(90deg, rgba(96, 59, 247, 0) 0.95%, #603BF7 53.37%, rgba(57, 34, 145, 0) 99.35%)"
                }}    
            >

            </div>
			<HistoryTable
				title="Poka History"
                histories={histories}
                onLeftClick={onLeftClick}
                onRightClick={onRightClick}
                page={page}
                maxPage={maxPage}
			/>
		</div>
	)
};

export default Page;
