import type {ReactNode} from "react";
import Alert from "./Alert";

export default function ErrorState({title, description, action}: {title: ReactNode; description?: ReactNode; action?: ReactNode}) {
    return (
        <Alert tone="error">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="font-semibold">{title}</p>
                    {description ? <div className="mt-1">{description}</div> : null}
                </div>
                {action}
            </div>
        </Alert>
    );
}
