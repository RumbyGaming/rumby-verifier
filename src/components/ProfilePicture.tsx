import Image from "next/image";
import { useMemo } from "react";

const ProfilePicture = ({ src, size, className }: { src?: string; size: number; className?: string; }) => {

    const imageSrc = useMemo(() => {
        return src || "/logo-192x192.png";
    }, [src]);

    return (
        <div
            className={`${className ?? ""} rounded-full flex items-center justify-center bg-[#3d3bf8]`}
            style={{
                height: size,
                width: size,
            }}
        >
            <Image
                src={imageSrc}
                alt="pfp"
                height={size}
                width={size}
                // className={`rounded-full ${removeBorder? "" : "border border-[#DFD8FA]"}`}
                className={`rounded-full`}
            />
        </div>
    )
}

export { ProfilePicture };