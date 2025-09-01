import { BorshInstructionCoder, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, VersionedTransactionResponse } from '@solana/web3.js';
import idl from '../../public/idl/rumby_contract.json';
import bs58 from 'bs58';

const bufFromIxData = (d: any): Buffer => {
    if (d instanceof Uint8Array) return Buffer.from(d);
    if (Array.isArray(d)) return Buffer.from(d);
    if (typeof d === 'string') {
        try { return Buffer.from(bs58.decode(d)); } catch { }
        return Buffer.from(d, 'base64');
    }
    throw new Error('Unrecognized ix data format');
}

// Helper function to safely resolve account keys
const resolveAccountKeys = (message: any, tx: VersionedTransactionResponse) => {
    if (message.getAccountKeys) {
        // v0 transaction with address lookup tables
        try {
            const resolvedKeys = message.getAccountKeys({
                accountKeysFromLookups: tx.meta?.loadedAddresses
                    ? {
                        writable: tx.meta.loadedAddresses.writable ?? [],
                        readonly: tx.meta.loadedAddresses.readonly ?? [],
                    }
                    : undefined,
            });

            // Store original message for fallback
            resolvedKeys.originalMessage = message;

            // Merge static account keys with address lookup table keys
            const mergedAccountKeys = [...(resolvedKeys.staticAccountKeys || [])];

            // Add writable lookup table accounts
            if (resolvedKeys.accountKeysFromLookups?.writable) {
                resolvedKeys.accountKeysFromLookups.writable.forEach((accountGroup: any) => {
                    if (Array.isArray(accountGroup)) {
                        mergedAccountKeys.push(...accountGroup);
                    } else {
                        mergedAccountKeys.push(accountGroup);
                    }
                });
            }

            // Add readonly lookup table accounts
            if (resolvedKeys.accountKeysFromLookups?.readonly) {
                resolvedKeys.accountKeysFromLookups.readonly.forEach((accountGroup: any) => {
                    if (Array.isArray(accountGroup)) {
                        mergedAccountKeys.push(...accountGroup);
                    } else {
                        mergedAccountKeys.push(accountGroup);
                    }
                });
            }

            // Create unified account keys array
            resolvedKeys.accountKeys = mergedAccountKeys;

            // Debug logging
            // console.log('Resolved keys structure:', {
            //     hasStaticAccountKeys: !!resolvedKeys.staticAccountKeys,
            //     staticAccountKeysLength: resolvedKeys.staticAccountKeys?.length,
            //     hasAccountKeys: !!resolvedKeys.accountKeys,
            //     accountKeysLength: resolvedKeys.accountKeys?.length,
            //     loadedAddresses: tx.meta?.loadedAddresses,
            //     mergedAccountKeysLength: mergedAccountKeys.length
            // });

            return resolvedKeys;
        } catch (e) {
            console.warn('Failed to resolve account keys with getAccountKeys, falling back to legacy:', e);
            return { staticAccountKeys: message.accountKeys, originalMessage: message };
        }
    } else {
        // Legacy transaction format
        return { staticAccountKeys: message.accountKeys, originalMessage: message };
    }
};

// Helper function to get account key by index
const getAccountKeyByIndex = (keys: any, index: number): PublicKey => {
    // Try the unified accountKeys array first (includes both static and lookup table accounts)
    if (keys.accountKeys && keys.accountKeys[index]) {
        return keys.accountKeys[index];
    }

    // Fallback to staticAccountKeys if unified array is not available
    if (keys.staticAccountKeys && keys.staticAccountKeys[index]) {
        return keys.staticAccountKeys[index];
    }

    // Last resort: try to get from the original message if available
    if (keys.originalMessage && keys.originalMessage.accountKeys && keys.originalMessage.accountKeys[index]) {
        return keys.originalMessage.accountKeys[index];
    }

    // Additional debugging - log the full keys structure
    console.error(`Account key resolution failed for index ${index}. Full keys structure:`, JSON.stringify(keys, null, 2));
    console.error(`Original message accountKeys length:`, keys.originalMessage?.accountKeys?.length);
    console.error(`Available indices:`, {
        staticAccountKeys: keys.staticAccountKeys ? `0-${keys.staticAccountKeys.length - 1}` : 'none',
        accountKeys: keys.accountKeys ? `0-${keys.accountKeys.length - 1}` : 'none',
        originalMessage: keys.originalMessage?.accountKeys ? `0-${keys.originalMessage.accountKeys.length - 1}` : 'none'
    });

    throw new Error(`Account key not found at index ${index}`);
};

export const decodeIxsWithIdl = (
    tx: VersionedTransactionResponse,
    idl: Idl,
) => {
    const coder = new BorshInstructionCoder(idl);
    const message = tx.transaction.message as any;
    const programId = new PublicKey(idl.address);

    // Resolve account keys (v0 safe)
    const keys = resolveAccountKeys(message, tx);

    const out: Array<{ name: string; args: any; index: number; inner?: boolean }> = [];

    // Top-level
    for (let i = 0; i < (message.compiledInstructions?.length ?? 0); i++) {
        const ix = message.compiledInstructions[i];
        const pid = getAccountKeyByIndex(keys, ix.programIdIndex);
        if (!pid.equals(programId)) continue;
        const decoded = coder.decode(bufFromIxData(ix.data));
        if (decoded) out.push({ name: decoded.name, args: decoded.data, index: i });
    }

    // Inner ixs (if you need them)
    for (const inner of tx.meta?.innerInstructions ?? []) {
        for (const ix of inner.instructions) {
            const pid = getAccountKeyByIndex(keys, ix.programIdIndex);
            if (!pid.equals(programId)) continue;
            const decoded = coder.decode(bufFromIxData(ix.data));
            if (decoded) out.push({ name: decoded.name, args: decoded.data, index: inner.index, inner: true });
        }
    }

    return out;
}

// Modified decoder that shows all instructions
export const decodeAllIxs = (tx: VersionedTransactionResponse, idl: Idl) => {
    const message = tx.transaction.message as any;

    // Resolve account keys (v0 safe)
    const keys = resolveAccountKeys(message, tx);

    const out: Array<{
        name: string;
        args: any;
        index: number;
        inner?: boolean;
        programId: string;
        rawData: string;
        accounts: string[];
    }> = [];

    // Top-level instructions
    for (let i = 0; i < (message.compiledInstructions?.length ?? 0); i++) {
        const ix = message.compiledInstructions[i];
        const pid = getAccountKeyByIndex(keys, ix.programIdIndex);

        // Get account keys for this instruction - handle both legacy and v0 formats
        const accountKeys = ((ix as any).accounts || (ix as any).accountKeyIndexes || []).map((accIndex: number) => {
            try {
                return getAccountKeyByIndex(keys, accIndex).toBase58();
            } catch (e) {
                return `unknown_${accIndex}`;
            }
        });

        // Try to decode with rumby IDL first
        try {
            const coder = new BorshInstructionCoder(idl as Idl);
            const decoded = coder.decode(bufFromIxData(ix.data));
            if (decoded) {
                out.push({
                    name: decoded.name,
                    args: decoded.data,
                    index: i,
                    programId: pid.toBase58(),
                    rawData: bs58.encode(bufFromIxData(ix.data)),
                    accounts: accountKeys
                });
                continue;
            }
        } catch (e) {
            // If rumby IDL fails, just show raw data
        }

        // If rumby IDL doesn't work, show raw instruction data
        out.push({
            name: 'unknown',
            args: null,
            index: i,
            programId: pid.toBase58(),
            rawData: bs58.encode(bufFromIxData(ix.data)),
            accounts: accountKeys
        });
    }

    // Inner instructions
    for (const inner of tx.meta?.innerInstructions ?? []) {
        for (const ix of inner.instructions) {
            const pid = getAccountKeyByIndex(keys, ix.programIdIndex);

            // Get account keys for this instruction - handle both legacy and v0 formats
            const accountKeys = ((ix as any).accounts || (ix as any).accountKeyIndexes || []).map((accIndex: number) => {
                try {
                    return getAccountKeyByIndex(keys, accIndex).toBase58();
                } catch (e) {
                    return `unknown_${accIndex}`;
                }
            });

            // Try to decode with rumby IDL first
            try {
                const coder = new BorshInstructionCoder(idl as Idl);
                const decoded = coder.decode(bufFromIxData(ix.data));
                if (decoded) {
                    out.push({
                        name: decoded.name,
                        args: decoded.data,
                        index: inner.index,
                        inner: true,
                        programId: pid.toBase58(),
                        rawData: bs58.encode(bufFromIxData(ix.data)),
                        accounts: accountKeys
                    });
                    continue;
                }
            } catch (e) {
                // If rumby IDL fails, just show raw data
            }

            // If rumby IDL doesn't work, show raw instruction data
            out.push({
                name: 'unknown',
                args: null,
                index: inner.index,
                inner: true,
                programId: pid.toBase58(),
                rawData: bs58.encode(bufFromIxData(ix.data)),
                accounts: accountKeys
            });
        }
    }

    return out;
}

export const getTxDetails = async(connection: Connection, txHash: string) => {
    if(!connection) return;

    try {
        // Check if transaction was successful
        const tx = await connection.getTransaction(txHash, {
            maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
            throw new Error(`Transaction not found for ${txHash}`);
        }

        // console.log(`\n=== All instructions decoded ===`);
        const allDecoded = decodeAllIxs(tx as VersionedTransactionResponse, idl as unknown as Idl);
        // console.log(`All decoded instructions:`, JSON.stringify(allDecoded, null, 2));
        // console.log({ allDecoded })

        // console.log(`\n=== All instructions decoded ===`);

        return allDecoded;
    }

    catch {
        console.log('Unable to get tx')
    }
};