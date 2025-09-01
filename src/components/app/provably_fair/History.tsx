
import { ProfilePicture } from "@/components/ProfilePicture";
import { useVerifier } from "@/providers/VerifierProvider";
import Image from "next/image";

type HistoryProps = {
	match_id: string;
	round_id: string;
	value: number;
	winner: string;
	winnerPfp?: string;
	chance?: number;
	// seed: string;
}

const History = ({
	match_id,
	round_id,
	value,
	winner,
	winnerPfp,
	chance,
	// seed,
}: HistoryProps) => {
	const { setMatchId, setRoundId, setForceVerify } = useVerifier();

	return (
		<button 
			className="flex flex-row text-[10px] text-white text-left px-[12px] pt-[12px] hover:bg-white/10 rounded py-[10px]"
			onClick={() => {
				setMatchId(match_id);
				setRoundId(round_id);
				setForceVerify(true);
			}}
		>
			<div className="w-[20%] min-w-[100px]">
				<span className="text-[#DFD8FA] text-[11px]">{match_id}</span>
			</div>
			<div className="w-[20%] min-w-[100px]">
				<span className="text-[#DFD8FA] text-[11px]">{round_id}</span>
			</div>
			<div className="w-[20%] min-w-[100px] flex flex-row items-center">
				<Image
					src="/images/wager-coin-sol.png"
					alt="sol"
					height={7.5}
					width={10}
					className="mr-[5px]"
				/>
				<span className="text-[#DFD8FA] text-[11px]">{value}</span>
			</div>
			<div className="w-[20%] min-w-[100px]">
				<span className="text-[#DFD8FA] text-[11px]">{chance? `${chance.toFixed(2)}` : "--"}</span>
			</div>
			<div className="w-[20%] min-w-[100px] flex flex-row items-center">
				<ProfilePicture
					src={winnerPfp}
					size={16}
					className="mr-[5px]"
				/>
				<span className="text-[#DFD8FA] text-[11px]">{winner}</span>
			</div>
			{/* <div className="w-[20%] min-w-[100px]">
				<span className="text-[#DFD8FA] text-[11px]">{seed}</span>
			</div> */}
		</button>
	)
}

export { History };