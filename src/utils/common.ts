import { RouletteOutcome } from "@/constants/common";
import { Connection } from "@solana/web3.js";
import keccak256 from "keccak256";

export function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, ms);
    });
}

export const isProduction = () => {
    return !!process.env.NEXT_PUBLIC_IS_PRODUCTION;
}

export const getExplorerLink = (type: "token" | "account" | "block" | "tx", it: string) => {
    const cluster = isProduction()? "?cluster=devnet" : "";
    return `https://solscan.io/${type}/${it}${cluster}`;
}

export const findTargetBlockHash = async (connection: Connection, targetHeight: number, fromSlot: number = -1) => {
    let slot = fromSlot === -1 ? await connection.getSlot('confirmed') : fromSlot;
    console.log(`fromSLot: ${fromSlot} | slot: ${slot} | targetHeight: ${targetHeight}`);

    if (isNaN(targetHeight)) {
        throw new Error(`Target height is not a number: ${targetHeight}`);
    }

    if (fromSlot >= 0 && fromSlot - slot > 50) {
        throw new Error(`From slot is too far from current slot: ${fromSlot} - ${slot} > 50`);
    }

    if (slot < 0) {
        throw new Error(`Slot is negative: ${slot}`);
    }

    const maxAttempts = 50;
    let attempts = 0;
    while (attempts < maxAttempts) {
        try {
            attempts++;
            console.log({attempts});

            const block = await connection.getBlock(slot, {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed',
                rewards: false,
                transactionDetails: 'none'
            });
            

            const currHeight = (block as any).blockHeight;
            console.log(`distance ${targetHeight - currHeight} | target: ${targetHeight}, curr: ${currHeight}`);
            if (block && currHeight === targetHeight) {
                return {block, slot};
            }

            if (block && currHeight > targetHeight) {
                console.log(`Gone too far, block height: ${currHeight}, target height: ${targetHeight}`);
                return null; // Gone too far
            }
        } catch (error) {
            console.log(error);
            await sleep(100);
            continue;
        }

        slot++;
        await new Promise((r) => setTimeout(r, 50)); // optional: avoid RPC spam
    }

    throw new Error(`Failed to find target block hash after ${maxAttempts} attempts`);
}

/**
 * Generate winning odds from server and public seeds.
 *
 * @param serverSeed Buffer of 32 bytes
 * @param publicSeed Buffer of 32 bytes
 * @param odds number (u64)
 * @returns [finalHash: bigint, winningResult: bigint]
 */
export const getRandomNumberFromSeeds = (serverSeed: Buffer, publicSeed: Buffer, odds: bigint) => {
    if (serverSeed.length !== 32 || publicSeed.length !== 32) {
        throw new Error('Both serverSeed and publicSeed must be 32 bytes long.');
    }

    const combinedSeed = Buffer.concat([Uint8Array.from(serverSeed), Uint8Array.from(publicSeed)]); // 64 bytes

    // keccak256 hash the combined seed
    const hashResult = keccak256(combinedSeed); // 32 bytes

    const upper = BigInt('0x' + hashResult.slice(0, 16).toString('hex'));
    const lower = BigInt('0x' + hashResult.slice(16, 32).toString('hex'));

    const finalHash = upper ^ lower;

    let result: bigint = BigInt(0);
    if (odds > BigInt(0)) {
        result = (finalHash % odds) + BigInt(1);
    }

    console.log(`final_hash ${finalHash.toString()} | odds ${odds} | result ${result.toString()}`);
    return result;
}

// Updated to work with 15 outcomes (0-14)
export const resolveRouletteOutcome = (roll: number): RouletteOutcome => {
    // Map the roll to outcomes 0-14 using modulo
    const outcomeIndex = roll % 15;

    // Direct array mapping - much cleaner and more maintainable
    const outcomes: RouletteOutcome[] = [
        RouletteOutcome.Jackpot,    // 0
        RouletteOutcome.Yellow,     // 1
        RouletteOutcome.Blue,       // 2
        RouletteOutcome.Yellow3,    // 3
        RouletteOutcome.Blue4,      // 4
        RouletteOutcome.Yellow5,    // 5
        RouletteOutcome.Blue6,      // 6
        RouletteOutcome.Yellow7,    // 7 (Yellow Pattern)
        RouletteOutcome.Blue8,      // 8
        RouletteOutcome.Yellow9,    // 9
        RouletteOutcome.Blue10,     // 10
        RouletteOutcome.Yellow11,   // 11
        RouletteOutcome.Blue12,     // 12
        RouletteOutcome.Yellow13,   // 13
        RouletteOutcome.Blue14,     // 14 (Blue Pattern)
    ];

    return outcomes[outcomeIndex];
}

/**
 * Returns the new object that has no reference to the old object to avoid mutations.
 * @param obj
 */
export const cloneObj = <T = any>(obj: T) => {
    return JSON.parse(JSON.stringify(obj)) as T;
}