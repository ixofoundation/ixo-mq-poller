export declare class MessageQ {
    connection: any;
    private queue;
    constructor(queue: string);
    connect(): Promise<any>;
    subscribe(): Promise<void>;
    private handleMessage(message);
}
declare const _default: MessageQ;
export default _default;
