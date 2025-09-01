'use client';
import Image from "next/image";
import Link from "next/link"
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Connection, PublicKey } from '@solana/web3.js';
import { Data, PokaData } from './types';
import { TxDescriber } from './TxDescriber';
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import keccak256 from "keccak256";
import { v4 } from 'uuid';
import { PokaTxDescriber } from './PokaTxDescriber';
import { PokaDeck } from './PokaDeck';
import { useVerifier } from "@/providers/VerifierProvider";
import axios from '@/services/axios';
config.autoAddCss = false;

const inactiveClass = "h-[56px] flex flex-row items-center min-w-[50px] px-[20px] rounded-t-[4px]";
const activeClass = inactiveClass + " bg-[linear-gradient(90deg,rgba(44,34,76,0.22),rgba(99,71,190,0.22))]";

type TabProps = {
    href: string;
    imageSrc: string;
    title: string;
}
const Tab = ({ 
    href,
    imageSrc,
    title,
}: TabProps) => {
    const pathname = usePathname();

    const isActive = useMemo(() => {
        return pathname === href;
    }, [pathname, href]);

    return (
        <Link
            href={href}
            className={isActive? activeClass : inactiveClass}
        >
            <Image
                src={`/images/${imageSrc}${isActive? "" : "-gray"}.png`}
                alt="game"
                height={104}
                width={104}
                className="h-[24px] w-auto"
            />
            <span className={`font-alexandria text-white tracking-[2%] leading-[14px] text-[14px] ml-[20px] ${!isActive && "hidden"}`}>{title}</span>
        </Link>
    )
}
const Layout = ({
  children,
}: {
  children: React.ReactNode
}) => {
    const [connection, setConnection] = useState<Connection>();
    const [rpcEndpoint, setRpcEndpoint] = useState("");
    const [data, setData] = useState<Data>();
    const [pokaData, setPokaData] = useState<PokaData>();
    const pathname = usePathname();
    const { matchId, roundId, setMatchId, setRoundId, forceVerify, setForceVerify } = useVerifier();

    const gameId = useMemo(() => {
        return pathname.replace("/", "");
    }, [pathname]);

    const hashedServerSeed = useMemo(() => {
        if(!data) return "";
        return bs58.encode(Uint8Array.from(keccak256((new PublicKey(data.server_seed)).toBuffer())));
    }, [data]);

    const pokaHashedServerSeed = useMemo(() => {
        if(!pokaData) return "";
        return bs58.encode(Uint8Array.from(keccak256((new PublicKey(pokaData.server_seed)).toBuffer())));
    }, [pokaData]);

    const betRecords = useMemo(() => {
        if(!data?.records || data.records.length === 0) return [];
        return data.records.filter(x => x.created_tx !== data.created_tx);
    }, [data]);

    const [createRangeStart, createRangeEnd] = useMemo(() => {
        if(!data?.records || data.records.length === 0) return [undefined, undefined];
        const createTxRecord = data.records.filter(x => x.created_tx === data.created_tx);
        if(!createTxRecord[0]) {
            return [undefined, undefined];
        }

        return [Number(createTxRecord[0].bet_range_start), Number(createTxRecord[0].bet_range_end)];
    }, [data]);

    const otherWinTxs = useMemo(() => {
        if(!data?.records || data.records.length === 0 || !data.otherWinnerTxs || data.otherWinnerTxs.length === 0) return [];
        return data.otherWinnerTxs.filter(x => !data.result_txs.includes(x));
    }, [data]);

    const pokaJoinRoundTxs = useMemo(() => {
        if(!pokaData?.records || pokaData.records.length === 0) return [];
        const filtered = pokaData.records.filter(x => x.status === "sitin");
        if(filtered.length === 0) {
            return [];
        }

        // get unique create txs
        return [...new Set(filtered.map(x => x.created_tx))];
    }, [pokaData]);

    const pokaPlaceBetTxs = useMemo(() => {
        if(!pokaData?.records || pokaData.records.length === 0) return [];
        const filtered = pokaData.records.filter(x => x.status !== "sitin");
        if(filtered.length === 0) {
            return [];
        }

        // get unique create txs
        return [...new Set(filtered.map(x => x.created_tx))];
    }, [pokaData]);

    const pokaFoldedPlayers = useMemo(() => {
        if(!pokaData?.records || pokaData.records.length === 0) return [];
        const filtered = pokaData.records.filter(x => x.poka_action === "fold");
        if(filtered.length === 0) {
            return [];
        }

        // get unique create txs
        return [...new Set(filtered.map(x => x.player))];
    }, [pokaData]);

    const onVerify = useCallback(async() => {
        if(!matchId) {
            return;
        }

        if(!roundId) {
            return;
        }

        if(!gameId) {
            return;
        }

        try {
            setData(undefined);
            setPokaData(undefined);
            const res = await axios.get<Data | PokaData>(`/${gameId}/${matchId}/${roundId}`);

            if(gameId === "poka") {
                setPokaData(res.data as PokaData);
            }

            else {
                setData(res.data as Data);
            }
        }

        catch(e: any) {
            if(e.response && e.response.data) {
                alert(e.response.data);
                return;
            }
            alert('Failed to get data');
        }
    }, [roundId, matchId, gameId]);

    useEffect(() => {
        const timeout = setTimeout(async() => {
            // setIsSettingConnection(true);
            try {
                const connection = new Connection(rpcEndpoint, 'confirmed');
                await connection.getLatestBlockhash();
                setConnection(connection);
                // alert('RPC set');
            }

            catch {
                // alert('Invalid RPC');
            }
            // setIsSettingConnection(false);
        }, 1000);

        return () => { clearTimeout(timeout) };
    }, [rpcEndpoint]);

    useEffect(() => {
        setMatchId("");
        setRoundId("");
    }, [gameId, setMatchId, setRoundId]);

    useEffect(() => {
        setData(undefined);
        setPokaData(undefined);
    }, [matchId, roundId]);

    useEffect(() => {
        if(!forceVerify) return;
        setForceVerify(false);
        onVerify();
    }, [forceVerify, onVerify, setForceVerify]);

    return (
        <div className="relative flex flex-col h-full items-center justify-center">
            <div className="absolute inset-0 flex justify-center">
                <Image
                    src="/images/bg-elements.png"
                    alt="elements"
                    height={1209}
                    width={1149}
                    className={`md:w-auto md:h-[calc(100vh-80px)] w-screen h-auto object-cover`}
                    priority
                />
            </div>
            <div className="relative flex flex-col items-center md:mt-[70px] mt-[20px]">
                <span className="text-gradient-white2 font-ibm text-[36px] leading=[24px]">PROVABLY FAIR</span>
                <span className="text-[#DFD8FA] text-[12px] leading=[24px] md:px-0 px-[20px] text-center">Verify your bets and learn how the website uses blockchain to verify all bets to ensure nothing is rigged.</span>
                <Link href="https://github.com/RumbyGaming/rumby-verifier" target="_blank" className="text-white text-[12px] mt-[20px]">{`>> Code is Available on Github <<`}</Link>
            </div>
            <div 
                className="h-[1px] w-full self-center my-[50px]"
                style={{
                    background: "linear-gradient(90deg, rgba(96, 59, 247, 0) 0.95%, #603BF7 53.37%, rgba(57, 34, 145, 0) 99.35%)"
                }}    
            >

            </div>
            <div className="relative flex flex-col items-start max-w-[1149px] h-full w-full md:px-0 px-[10px]">
                <div className="md:flex hidden flex-row items-center justify-center w-full">
                    <Tab 
                        href="/jackpot"
                        title="Jackpot"
                        imageSrc="game-pvp-jackpot"
                    />
                    <Tab 
                        href="/coinflip"
                        title="Coinflip"
                        imageSrc="game-coinflip"
                    />
                    <Tab 
                        href="/roulette"
                        title="Roulette"
                        imageSrc="game-roulette"
                    />
                    <Tab 
                        href="/poka"
                        title="Poka"
                        imageSrc="game-poker"
                    />
                </div>
                <div 
                    className="flex flex-col max-w-[1149px] md:min-h-[700px] w-full p-[20px] rounded-[12px] border border-[#614AAB52]"
                    style={{
                        background: "linear-gradient(0deg, rgba(18, 14, 31, 0.82), rgba(18, 14, 31, 0.82)),radial-gradient(147.15% 255.45% at -2.82% -6.2%, rgba(18, 14, 31, 0.2) 14.6%, rgba(56, 44, 96, 0.2) 100%)",
                    }}    
                >
                    {children}

                    <div className="flex flex-col w-full font-alexandria text-white mt-[50px]">
                        <div className="flex flex-row space-x-[10px] mb-[5px] items-center">
                            <span>RPC Status: </span>
                            {
                                connection?
                                <div className="h-[15px] w-[15px] bg-green-500 rounded-full">
                                </div> :
                                <div className="h-[15px] w-[15px] bg-red-500 rounded-full">
                                </div>
                            }
                        </div>

                        <div className="flex flex-row space-x-[10px] items-center">
                            <input 
                                type="text" 
                                className={`text-white text-[15px] pl-[25px] pr-[15px] py-[10px] rounded-[4px] text-left border border-[#5E53FF6B] w-full disabled:bg-white/20`}
                                onChange={({target: { value }}) => { setRpcEndpoint(value) }} 
                                value={rpcEndpoint}
                                placeholder='https://your.rpc'
                            />
                        </div>

                        <div className="flex flex-row w-full justify-between space-x-[10px] mt-[10px]">
                            <input 
                                type="number" 
                                className={`text-white text-[15px] pl-[25px] pr-[15px] py-[10px] rounded-[4px] text-left border border-[#5E53FF6B] w-full disabled:bg-white/20`}
                                onChange={({target: { value }}) => { setMatchId(value) }} 
                                value={matchId}
                                placeholder='Match Id'
                                disabled={gameId === "coinflip"}
                            />
                            <input 
                                type="number" 
                                className={`text-white text-[15px] pl-[25px] pr-[15px] py-[10px] rounded-[4px] text-left border border-[#5E53FF6B] w-full`}
                                onChange={({target: { value }}) => { 
                                    setRoundId(value) ;
                                    if(gameId === "coinflip") {
                                        setMatchId(value);
                                    }
                                }} 
                                value={roundId}
                                placeholder='Round Id'
                            />
                            <button
                                onClick={onVerify}
                                className={`px-[15px] py-[5px] w-[95px] rounded-full shadow-[-2px_-2px_8px_0px_#000000D9_inset,2px_2px_8px_0px_#3C3CFF_inset] hover:shadow-[-2px_-2px_8px_0px_#000000D9_inset,2px_2px_8px_0px_#3C3CFF_inset,0px_0px_5px_1px_rgba(116,92,43)]`}
                                style={{
                                    borderWidth: 1,
                                    borderColor: "#3C3CFF",
                                    background: "radial-gradient(59.08% 279.3% at 49.57% 50%, rgba(60, 60, 255, 0.7) 0%, rgba(25, 15, 68, 0.7) 100%)",
                                }}
                                disabled={matchId.trim() === "" || roundId.trim() === "" || !connection}
                            >
                                <div className="uppercase text-white font-[600] font-alexandria md:text-[16px] text-[12px] animate-big-small">Verify</div>
                            </button>
                        </div>
                        {/* <button className='cursor-pointer outline-none bg-green-700 px-2 py-1 rounded mt-[10px]' onClick={() => {}}>Show Game Description</button> */}

                        {
                            gameId === "poka"?
                            <>
                            {
                                pokaData &&
                                <>
                                <div className="flex flex-col bg-white/10 w-full p-5 mt-5 rounded text-white text-[12px] font-ibm">
                                    <strong className="text-[15px] mb-[10px]">Round Details</strong>
                                    <ul>
                                        <li>Server Seed: <strong>{pokaData.server_seed}</strong></li>
                                        <li>Hashed Server Seed: <strong>{pokaData.hashed_server_seed}</strong></li>
                                        <li>Client Seeds: </li>
                                        <ul style={{ listStyle: "decimal", paddingLeft: 50 }}>
                                            {
                                                pokaData.client_seeds.map(x => (
                                                    <li key={v4()}><strong>{x}</strong></li>
                                                ))
                                            }
                                        </ul>
                                        {/* <li>Target Block: <strong>{data.current_slot}</strong></li> */}
                                    </ul>
                                </div>

                                <PokaTxDescriber
                                    roundId={roundId}
                                    title='Create Match Transaction'
                                    tx={pokaData.match_created_tx}
                                    connection={connection}
                                    hashedServerSeed={pokaHashedServerSeed}
                                />

                                {
                                    pokaData.match_created_tx !== pokaData.round_created_tx &&
                                    <PokaTxDescriber
                                        roundId={roundId}
                                        title='Create Round Transaction'
                                        tx={pokaData.round_created_tx}
                                        connection={connection}
                                        hashedServerSeed={pokaHashedServerSeed}
                                    />
                                }

                                {
                                    pokaJoinRoundTxs.length > 0 &&
                                    pokaJoinRoundTxs.map((x) => (
                                        <PokaTxDescriber
                                            key={v4()}
                                            roundId={roundId}
                                            title='Player Join Round'
                                            tx={x}
                                            connection={connection}
                                            clientSeeds={pokaData.client_seeds}
                                            serverDeck={pokaData.deck}
                                        />
                                    ))
                                }

                                <PokaDeck
                                    serverSeed={pokaData.server_seed}
                                    serverDeck={pokaData.deck}
                                    clientSeeds={pokaData.client_seeds}
                                />

                                {
                                    pokaPlaceBetTxs.length > 0 &&
                                    pokaPlaceBetTxs.map((x) => (
                                        <PokaTxDescriber
                                            key={v4()}
                                            roundId={roundId}
                                            title='Draw Card Events'
                                            tx={x}
                                            connection={connection}
                                            clientSeeds={pokaData.client_seeds}
                                            serverDeck={pokaData.deck}
                                        />
                                    ))
                                }
                                <PokaTxDescriber
                                    key={v4()}
                                    roundId={roundId}
                                    title='Reveal Winner'
                                    tx={pokaData.result_tx}
                                    connection={connection}
                                    clientSeeds={pokaData.client_seeds}
                                    serverDeck={pokaData.deck}
                                    pokaFoldedPlayers={pokaFoldedPlayers}
                                    records={pokaData.records}
                                />
                                </>
                            }
                            </>:
                            <>
                            {
                                data &&
                                <>
                                <div className="flex flex-col bg-white/10 w-full p-5 mt-5 rounded text-white text-[12px] font-ibm">
                                    <strong className="text-[15px] mb-[10px]">Match Details</strong>
                                    <ul>
                                        <li>Server Seed: <strong>{data.server_seed}</strong></li>
                                        <li>Hashed Server Seed: <strong>{data.hashed_server_seed}</strong></li>
                                        <li>Public Seed: <strong>{data.public_seed}</strong></li>
                                        <li>Target Block: <strong>{data.public_seed_block_height}</strong></li>
                                        <li>Random Number: <strong>{data.random_number_revealed}</strong></li>
                                        {/* <li>Target Block: <strong>{data.current_slot}</strong></li> */}
                                    </ul>
                                </div>


                                <TxDescriber
                                    gameId={gameId}
                                    title='Create Transaction'
                                    tx={data.created_tx}
                                    connection={connection}
                                    hashedServerSeed={hashedServerSeed}
                                    rangeStart={Number(createRangeStart)}
                                    rangeEnd={Number(createRangeEnd)}
                                />

                                {
                                    betRecords.length > 0 &&
                                    betRecords.map((x, index) => (
                                        <TxDescriber
                                            gameId={gameId}
                                            key={v4()}
                                            title={gameId === "coinflip"? "Opponent Bet" : `Bet ${index + 1}`}
                                            tx={x.created_tx}
                                            connection={connection}
                                            // hashedServerSeed={hashedServerSeed}
                                            rangeStart={Number(x.bet_range_start)}
                                            rangeEnd={Number(x.bet_range_end)}
                                        />
                                    ))
                                }

                                {
                                    data.result_txs.map((r, index) => (
                                        <TxDescriber
                                            key={v4()}
                                            gameId={gameId}
                                            title={`Result Transaction ${index + 1}`}
                                            tx={r}
                                            connection={connection}
                                            serverSeed={data.server_seed}
                                            publicSeed={data.public_seed}
                                            randomNumber={Number(data.random_number_revealed)}
                                            totalAmount={Number(data.total_amount)}
                                            records={data.records}
                                            targetBlockHeight={Number(data.public_seed_block_height)}
                                            fromSlot={Number(data.current_slot)}
                                        />

                                    ))
                                }

                                {
                                    otherWinTxs.length > 0 &&
                                    otherWinTxs.map((x) => (
                                        <TxDescriber
                                            gameId={gameId}
                                            key={v4()}
                                            title={`Winning Distribution`}
                                            tx={x}
                                            connection={connection}
                                            records={data.records}
                                        />
                                    ))
                                }
                                </>
                            }
                            </>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export { Layout };