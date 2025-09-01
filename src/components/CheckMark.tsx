import { faCheckCircle, faXmarkCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type CheckMarkProps = {
    isSame: boolean;
}
const CheckMark = ({isSame}: CheckMarkProps) => {
    if(!isSame) {
        return <FontAwesomeIcon icon={faXmarkCircle} color="red"/>;
    }

    return (
        <FontAwesomeIcon icon={faCheckCircle} color="#00ff00"/>
    )
}

export { CheckMark };