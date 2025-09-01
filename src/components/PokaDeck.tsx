import { PokaCard } from "@/components/types";
import { useCallback, useMemo } from "react";
import { v4 } from "uuid";
import { CheckMark } from "./CheckMark";
import { combineSeed, generateDeck, getCardAndSuitFromNumber } from "@/utils/poka";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

export type PokaDeckProps = {
    serverSeed: string;
    clientSeeds: string[];
    serverDeck: PokaCard[];
}
const PokaDeck = ({
    serverSeed,
    clientSeeds,
    serverDeck,
}: PokaDeckProps) => {
    const {calculatedCards, /* leaves, merkleRoot */} = useMemo(() => {
        if(clientSeeds.length === 0) return {
            calculatedCards: [],
        };
        const uintSeeds = clientSeeds.map(x => bs58.decode(x));
        const uintServerSeed = bs58.decode(serverSeed);
        const combinedSeed = combineSeed(Buffer.from(uintServerSeed), uintSeeds.map(x => Buffer.from(x)));
        const deck = generateDeck(combinedSeed);
        return {
            calculatedCards: deck.deck,
            leaves: deck.leaves,
            merkleRoot: deck.merkleRoot,
        }
    }, [clientSeeds, serverSeed]);

    const Cards = useCallback(() => {
        const cards: React.ReactElement[] = [];
        for(let i = 0; i < serverDeck.length; i++) {
            const calculatedName = calculatedCards[i] !== undefined? getCardAndSuitFromNumber(calculatedCards[i]).name : "";
            let bgColor = "";
            if(serverDeck[i].player === "Community") {
                bgColor = "bg-yellow-300/50";
            }

            else if(serverDeck[i].player !== "--") {
                bgColor = "bg-blue-300/50";
            }

            cards.push(
                <div key={v4()} className={`${bgColor} flex flex-row w-full relative group text-center py-[5px]`}>
                    <div className="w-[25%]">{i}</div>
                    <div className={`w-[25%] ${calculatedName === "GOLD"? "text-yellow-600 font-bold" : ""}`}>{serverDeck[i].label}</div>
                    <div className={`w-[25%] ${calculatedName === "GOLD"? "text-yellow-600 font-bold" : ""}`}>{calculatedName}</div>
                    <div className={`w-[25%]`}><CheckMark isSame={calculatedCards[i] !== undefined && Number(serverDeck[i].card_number) === Number(calculatedCards[i])}/></div>
                    <div
                        className="absolute bottom-0 left-0
                            w-max px-2 py-1 text-sm text-white
                            bg-gray-700 rounded shadow-lg 
                            opacity-0 group-hover:opacity-100 group-hover:block hidden">
                            {serverDeck[i].player}
                    </div>
                </div>
            )
        }

        return cards;
    }, [serverDeck, calculatedCards]);

    return (
        <div className="flex flex-col bg-white/10 w-full p-5 mt-5 rounded text-white font-ibm text-[12px]">
            <strong className="mb-1 text-center text-[15px] font-bold">Deck</strong>
            <span className="text-[12px] mb-5 text-right">** Hover to show the addresses that own the cards</span>
            <div className="flex flex-col w-full">
                <div className="flex flex-row w-full text-center">
                    <div className="w-[25%]">Index</div>
                    <div className="w-[25%]">Server</div>
                    <div className="w-[25%]">Calculated</div>
                    <div className="w-[25%]"></div>
                </div>

                <Cards />
            </div>

        </div>
    )
}

export { PokaDeck }