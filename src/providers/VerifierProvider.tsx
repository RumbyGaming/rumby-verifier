'use client';
import React, { createContext, useContext, ReactNode, useState } from "react";
type VerifierType = {
    matchId: string;
    setMatchId: (matchId: string) => void;
    roundId: string;
    setRoundId: (roundId: string) => void;
    forceVerify: boolean;
    setForceVerify: (forceVerify: boolean) => void;
};

const VerifierContext = createContext<VerifierType | undefined>(undefined);

export const VerifierProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [matchId, setMatchId] = useState("");
    const [roundId, setRoundId] = useState("");
    const [forceVerify, setForceVerify] = useState(false);

    return <VerifierContext.Provider 
                value={{ 
                    matchId,
                    setMatchId,
                    roundId,
                    setRoundId,
                    forceVerify,
                    setForceVerify,
                }}
            >
                {children}
            </VerifierContext.Provider>;
};

export const useVerifier = () => {
    const context = useContext(VerifierContext);
    if (!context) {
        throw new Error("useVerifier must be used within a VerifierProvider");
    }
    return context;
};
