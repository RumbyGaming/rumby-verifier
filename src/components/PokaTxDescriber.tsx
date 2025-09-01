import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTxDetails } from "@/utils/parser";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { PokaCard, PokaRecord } from "@/components/types";
import { v4 } from "uuid";
import { CheckMark } from "./CheckMark";
import { PokerAction } from "@/constants/poka";
import { processRound } from "@/utils/poka";
import { getExplorerLink } from "@/utils/common";
import { useVerifier } from "@/providers/VerifierProvider";

type PokaTxDescriberProps = {
    roundId: string;
    title: string;
    connection?: Connection;
    description?: string;
    tx?: string;
    hashedServerSeed?: string;
    isGettingBlock?: boolean;
    records?: PokaRecord[];
    clientSeeds?: string[];
    serverDeck?: PokaCard[];
    pokaFoldedPlayers?: string[];
}
const PokaTxDescriber = ({
    roundId,
    title, 
    connection, 
    // description, 
    tx,
    hashedServerSeed,
    records,
    clientSeeds,
    serverDeck,
    pokaFoldedPlayers,
}: PokaTxDescriberProps) => {
    const { setForceVerify } = useVerifier();
    const [hasError, setHasError] = useState(false);
    const [newMatchEvent, setNewMatchEvent] = useState<any>();
    const [newRoundEvent, setNewRoundEvent] = useState<any>();
    const [placeBetEvents, setPlaceBetEvents] = useState<any>();
    const [revealEvent, setRevealEvent] = useState<any>();

    const result = useMemo(() => {
        if(!records) return;
        if(!serverDeck) return;
        if(!pokaFoldedPlayers) return;

        const res = processRound(serverDeck, pokaFoldedPlayers);
        if(!res) return;

        const {
            winners,
            // eliminatedPlayerIds,
            // playersEliminated,
            bestCards,
            // bestComparators,
            bestName,
            // bestScore,
        } = res;

        // get records that are within the random number range
        return {
            winners,
            bestCards,
            bestName,
        };
    }, [records, serverDeck, pokaFoldedPlayers]);

    const onchainWinners = useMemo(() => {
        if(!revealEvent) return [];
        if(!revealEvent.winners) return [];
        return revealEvent.winners.map((x: any) => x.player.toBase58());
    }, [revealEvent]);

    const Events = useCallback(() => {
        const events: React.ReactElement[] = [];
        if(newMatchEvent) {
            events.push(
                <div key={v4()}>
                    <strong className="text-[15px] mb-[10px]">Event: New Match</strong>
                    <ul>
                        <li>Mint Set: <Link href={`${getExplorerLink("token", newMatchEvent.match_data?.mint.toBase58())}`} target="_blank">{newMatchEvent.match_data?.mint.toBase58()}</Link></li>
                    </ul>
                </div>
            )
        }

        if(newRoundEvent) {
            const eventHashedSeed = bs58.encode(newRoundEvent.hashed_server_seed).toString();
            events.push(
                <div key={v4()}>
                    <strong className="text-[15px] mb-[10px]">Event: New Game Round</strong>
                    <ul>
                        <li>Round: <strong className="text-[15px] mb-[10px]">{newRoundEvent.round.toNumber()}</strong></li>
                        <li>Hashed Server Seed (Raw): <strong className="text-[15px] mb-[10px]">[{newRoundEvent.hashed_server_seed.join(", ")}]</strong></li>
                        <li>Hashed Server Seed (Decoded): <strong className="text-[15px] mb-[10px]">{eventHashedSeed} <CheckMark isSame={eventHashedSeed === hashedServerSeed}/></strong></li>
                    </ul>
                </div>
            )
        }

        if(placeBetEvents && placeBetEvents.length > 0) {
            for(const placeBetEvent of placeBetEvents) {
                let clientSeed = "";
                let eventName = "";
                let isSitIn = false;
                switch(placeBetEvent.poker_action) {
                    case PokerAction.SmallBlind:
                        isSitIn = true;
                        eventName = "Sit In";
                        clientSeed = bs58.encode(placeBetEvent.client_seed);
                        break;

                    case PokerAction.PreFlop:
                        eventName = "Distribute Cards";
                        break;

                    case PokerAction.NormalCard:
                        eventName = "Buy Normal Card";
                        break;
                        
                    case PokerAction.MysteryCard:
                        eventName = "Buy Mystery Card";
                        break;
                        
                    case PokerAction.SitIn:
                        eventName = "Sit In";
                        break;
                        
                    case PokerAction.Fold:
                        eventName = "Fold";
                        break;
                }

                const cards: string[] = [];
                let playerHasCards = serverDeck !== undefined;

                if(placeBetEvent.card_index.length > 0 && serverDeck) {
                    for(const i of placeBetEvent.card_index) {
                        if(!serverDeck[i]) {
                            continue;
                        }

                        cards.push(serverDeck[i].label);
                    }
                }

                if(serverDeck) {
                    for(const i of placeBetEvent.card_index) {
                        playerHasCards = playerHasCards && serverDeck[i].player === placeBetEvent.player.toBase58();
                    }

                }

                events.push(
                    <div key={v4()}>
                        <strong className="text-[15px] mb-[10px]">Event: {eventName}</strong>
                        <ul>
                            <li>Player: <Link href={`${getExplorerLink("account", placeBetEvent.player.toBase58())}`} target="_blank"><strong className="text-[15px] mb-[10px]">{placeBetEvent.player.toBase58()}</strong></Link></li>
                            {
                                isSitIn &&
                                <li>Client Seed: <strong className="text-[15px] mb-[10px]">{clientSeed} <CheckMark isSame={!!clientSeeds?.includes(clientSeed)}/></strong></li>
                            }
                            {
                                placeBetEvent.card_index.length > 0 &&
                                <li>Card Index(es): <strong className="text-[15px] mb-[10px]">{placeBetEvent.card_index.join(", ")}</strong> <CheckMark isSame={playerHasCards}/></li>
                            }
                            {
                                placeBetEvent.card_index.length > 0 &&
                                <li>Card(s): <strong className="text-[15px] mb-[10px]">{cards.join(", ")}</strong></li>
                            }
                            {/** have to change to mint decimals */}
                            {
                                placeBetEvent.amount > 0 &&
                                <li>Paid: <strong className="text-[15px] mb-[10px]">{Number(BigInt(placeBetEvent.amount)) / LAMPORTS_PER_SOL}</strong></li>
                            }
                        </ul>
                    </div>
                )
            }
        }

        if(revealEvent) {
            events.push(
                <div key={v4()}>
                    <strong className="text-[15px] mb-[10px]">Event: Reveal Winners</strong>
                    <ul>
                        <li>
                            Winners (On Chain): {revealEvent.winners_count ?? 0}
                            <ul style={{
                                listStyle: "decimal",
                                paddingLeft: 50
                            }}>
                                {
                                    onchainWinners.map((x: any) => (
                                        <li key={v4()}>{x}</li>
                                    ))
                                }
                            </ul>
                        </li>
                        {
                            result && result.bestCards &&
                            <>
                            <li className="mt-5">Result: <strong className="text-[15px] mb-[10px]">{result.bestName}</strong></li>
                            <li>
                                Winners (Calculated): {result.winners.length ?? 0}
                                <ul style={{
                                    listStyle: "decimal",
                                    paddingLeft: 50
                                }}>
                                    {
                                        result.winners.map((x) => (
                                            <li key={v4()}>
                                                {x} <CheckMark isSame={onchainWinners.includes(x)}/>
                                                <br />
                                                {serverDeck!.filter(y => result.bestCards!.includes(Number(y.card_number)) && (x === y.player || y.player === "Community")).sort((a, b) => Number(a.card_number) - Number(b.card_number)).map(z => z.label).join(", ")}{}
                                            </li>
                                        ))
                                    }
                                </ul>
                            </li>
                            </>
                        }
                    </ul>
                </div>
            )
        }

        if(events.length === 0) return null;

        return (
            <>
            {...events}
            </>
        );
    }, [newMatchEvent, newRoundEvent, placeBetEvents, revealEvent, hashedServerSeed, clientSeeds, serverDeck, onchainWinners, result]);

    useEffect(() => {
        setRevealEvent(undefined);
        setPlaceBetEvents(undefined);
        setNewMatchEvent(undefined);
        setNewRoundEvent(undefined);
    }, [tx]);

    useEffect(() => {
        if(!tx) return;
        if(!connection) return;
        setHasError(false);
        const getData = async() => {
            const placeBetEvents: any = [];
            try {
                const events = await getTxDetails(connection, tx);
                
                if(!events) throw Error("");
                for(const event of events) {
                    switch(event.name) {
                        case "ix2":
                            placeBetEvents.push(event.args);
                            break;

                        case "ix3":
                            setRevealEvent(event.args);
                            break;

                        case "ix4":
                            if(event.args.round.toNumber() === Number(roundId)) {
                                setNewRoundEvent(event.args);
                            }
                            break;

                        case "ix5":
                            setNewMatchEvent(event.args);
                            break;
                    }
                }

                if(placeBetEvents.length > 0) {
                    setPlaceBetEvents(placeBetEvents);
                }
            }

            catch(e) {
                console.log(e)
                setHasError(true);
            }
        }

        getData();
    }, [tx, connection, roundId]);

    if(!tx) return null;

    return (
        <div className="flex flex-col bg-white/10 w-full p-5 mt-5 rounded text-white font-ibm text-[12px]">
            <strong className="text-[15px] mb-[10px]">{title}</strong>
            <Link
                href={`${getExplorerLink("tx", tx)}`}
                target="_blank"
            >
                <div className="flex flex-row items-center">
                    <FontAwesomeIcon icon={faLink} />
                    <span className="ml-3">{tx.substring(0, 5) + "..." + tx.substring(tx.length - 5, tx.length)}</span>
                </div>
            </Link>
            {
                hasError?
                <div className="mt-[20px] flex flex-col items-start">
                    <span>Encountered an error when getting this transaction</span>
                    <button className="mt-[3px] px-3 py-1 bg-green-700 rounded" onClick={() => { setForceVerify(true); }}>Retry?</button>
                </div>:
                <div className="mt-[30px] space-y-[20px]">
                    <Events />
                </div>
            }
        </div>
    )
}

export { PokaTxDescriber };