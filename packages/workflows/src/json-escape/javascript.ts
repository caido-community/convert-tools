import { BytesInput, SDK } from "caido:workflow";

export function run(input: BytesInput, sdk: SDK) {
    let parsed = sdk.asString(input);
    return JSON.stringify(parsed);
}