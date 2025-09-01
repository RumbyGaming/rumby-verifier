import Image from "next/image";
import { History as HistoryItem } from "./History";
import { v4 } from "uuid";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { History } from "@/app/types";

type HistoryTableProps = {
    title: string;
    onLeftClick: () => void;
    onRightClick: () => void;
    histories: History[];
    page: number;
    maxPage: number;
}
const HistoryTable = ({
    title,
    onLeftClick,
    onRightClick,
    histories,
    page, 
    maxPage,
}: HistoryTableProps) => {
    return (
        <>
        <div className="flex w-full min-h-[450px] flex-col overflow-x-auto no-scrollbar">
            <span className="text-white font-bold text-[16px]">{title}</span>
            <div className="flex flex-col space-y-[10px] mt-[12px]">
                <div className="flex flex-row text-[10px] text-white text-left px-[12px] pt-[12px]">
                    <div className="w-[20%] min-w-[100px]">
                        <span className="text-[#DFD8FA] text-[11px]">Match ID</span>
                    </div>
                    <div className="w-[20%] min-w-[100px]">
                        <span className="text-[#DFD8FA] text-[11px]">Round ID</span>
                    </div>
                    <div className="w-[20%] min-w-[100px]">
                        <span className="text-[#DFD8FA] text-[11px]">Value</span>
                    </div>
                    <div className="w-[20%] min-w-[100px]">
                        <span className="text-[#DFD8FA] text-[11px]">Chance (%)</span>
                    </div>
                    <div className="w-[20%] min-w-[100px]">
                        <span className="text-[#DFD8FA] text-center text-[11px]">Winner</span>
                    </div>
                    {/* <div className="w-[20%] min-w-[100px]">
                        <span className="text-[#DFD8FA] text-[11px]">Game Seed</span>
                    </div> */}
                </div>
                {
                    histories.map(x => (
                        <HistoryItem
                            key={v4()}
                            match_id={x.match_id}
                            round_id={x.round_id}
                            winner={x.winner}
                            value={Number(x.win_amount) / LAMPORTS_PER_SOL}
                            // only jackpot has varying chances
                            // other games will default to 100 as chance
                            chance={Number(x.chance) === 100? undefined : Number(x.chance)}
                        />
                    ))
                }
            </div>
        </div>
        <div className="flex flex-row justify-end mt-[30px]">
            <div className="flex flex-row space-x-[10px] items-center">
                <span className="text-[#DFD8FA] text-[11px]">{page + 1} / {maxPage + 1}</span>
                <button
                    className="bg-[#FFFFFF0F] w-[20px] h-[20px] flex items-center justify-center rounded-[3px]"
                    onClick={onLeftClick}
                >
                    <Image
                        src="/images/chevron-left-white.png"
                        alt="left"
                        height={12}
                        width={12}
                    />
                </button>
                <button
                    className="bg-[#FFFFFF0F] w-[20px] h-[20px] flex items-center justify-center rounded-[3px]"
                    onClick={onRightClick}
                >
                    <Image
                        src="/images/chevron-right-white.png"
                        alt="right"
                        height={12}
                        width={12}
                    />
                </button>
            </div>
        </div>
        </>
    )
}

export { HistoryTable };