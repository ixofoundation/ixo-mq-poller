import axios from 'axios';

var amqplib = require('amqplib');
var dateFormat = require('dateformat');

const BLOCKCHAIN_URI_SYNC = (process.env.BLOCKCHAIN_URI_SYNC || '');
const BLOCKCHAIN_URI_COMMIT = (process.env.BLOCKCHAIN_URI_COMMIT || '');
const ETHEREUM_API = (process.env.ETHEREUM_API || 'https://mainnet.infura.io/');

export class MessageQ {

    connection: any;

    private queue: string;

    constructor(queue: string) {
        this.queue = queue;
    }

    dateTimeLogger(): string {
        return dateFormat(new Date(), "yyyy-mm-dd hh:mm:ss:l");
    }

    connect(): Promise<any> {
        var inst: any;
        inst = this;
        return new Promise(function (resolve: Function, reject: Function) {
            amqplib.connect(process.env.RABITMQ_URI || '')
                .then((conn: any) => {
                    inst.connection = conn;
                    console.log(inst.dateTimeLogger() + ' RabbitMQ connected');
                    resolve(conn);
                }, () => {
                    throw new Error("Cannot connect to RabbitMQ Server");
                });
        });
    }

    public async subscribe() {
        try {
            const channel = await this.connection.createChannel();
            channel.assertExchange("pds.ex", "direct", { durable: true });
            channel.assertQueue(this.queue, {
                durable: true
            })
                .then(() => {
                    channel.bindQueue(this.queue, 'pds.ex');
                })
                .then(() => {
                    channel.prefetch(50);
                    channel.consume(this.queue, (messageData: any) => {

                        if (messageData === null) {
                            return;
                        }

                        const message = JSON.parse(messageData.content.toString());

                        this.handleMessage(message.data)
                            .then((response) => {
                                let msgResponse = {
                                    msgType: message.data.msgType,
                                    txHash: message.txHash,
                                    data: response.data.result
                                }
                                channel.sendToQueue('pds.res', Buffer.from(JSON.stringify(msgResponse)), {
                                    persistent: false,
                                    contentType: 'application/json'
                                });
                                return channel.ack(messageData);
                            }, (error) => {
                                channel.sendToQueue('pds.res', Buffer.from(JSON.stringify({ msgType: "error", data: error })), {
                                    persistent: false,
                                    contentType: 'application/json'
                                });
                                return channel.nack(messageData, true, true);
                            });
                    });
                }, (error: any) => {
                    throw error;
                });

        } catch (error) {
            throw new Error(error.message);
        }
    }

    private handleMessage(message: any): Promise<any> {
        return new Promise((resolve: Function, reject: Function) => {
            console.log(this.dateTimeLogger() + ' consume from queue' + JSON.stringify(message));
            if (message.msgType === 'eth') {
                let txnId = message.data
                axios({
                    method: 'post',
                    url: ETHEREUM_API,
                    data: { jsonrpc: "2.0", method: "eth_getTransactionByHash", params: [txnId], id: 1 }
                })
                    .then((response: any) => {
                        console.log(this.dateTimeLogger() + ' received response from ethereum ' + response.data.result.hash);
                        resolve(response);
                    })
                    .catch((reason) => {
                        console.log(this.dateTimeLogger() + ' no response from ethereum ' + reason);
                        reject(reason);
                    });

            } else {
                let blockchainUrl = message.commit ? BLOCKCHAIN_URI_COMMIT : BLOCKCHAIN_URI_SYNC;
                axios.get(blockchainUrl + message.data)
                    .then((response: any) => {
                        console.log(this.dateTimeLogger() + ' received response from blockchain ' + response.data.result.hash);
                        resolve(response);
                    })
                    .catch((reason) => {
                        console.log(this.dateTimeLogger() + ' no response from blockchain ' + reason);
                        reject(reason);
                    });
            }
        });
    }
}

export default new MessageQ('pds');