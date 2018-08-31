import axios from 'axios';

var amqplib = require('amqplib');


const BLOCKCHAIN_URI_TENDERMINT = (process.env.BLOCKCHAIN_URI_TENDERMINT || '');
const ETHEREUM_API = (process.env.ETHEREUM_API || 'https://mainnet.infura.io/');

export class MessageQ {

    connection: any;

    private queue: string;

    constructor(queue: string) {
        this.queue = queue;
    }

    connect(): Promise<any> {
        var inst: any;
        inst = this;
        return new Promise(function (resolve: Function, reject: Function) {
            amqplib.connect(process.env.RABITMQ_URI || '')
                .then((conn: any) => {
                    inst.connection = conn;
                    console.log('RabbitMQ connected');
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
            channel.assertExchange("pds.dlx", "fanout", { durable: true });
            channel.assertQueue(this.queue, {
                durable: true,
                deadLetterExchange: "pds.dlx",
                deadLetterRoutingKey: "dlx.rk"
            })
                .then(() => {
                    channel.bindQueue(this.queue, 'pds.ex');
                })
                .then(() => {
                    channel.prefetch(1);
                    channel.consume(this.queue, (messageData: any) => {

                        if (messageData === null) {
                            return;
                        }

                        const message = JSON.parse(messageData.content.toString());

                        this.handleMessage(message)
                            .then((response) => {
                                let msgResponse = {
                                    msgType: message.msgType,
                                    projectDid: message.projectDid,
                                    data: response.data.result
                                }
                                channel.sendToQueue('pds.res', Buffer.from(JSON.stringify(msgResponse)));
                                console.log('ACK');
                                return channel.ack(messageData);
                            }, (error) => {
                                channel.sendToQueue('pds.res', Buffer.from("Exception encountered processing message request"));
                                console.log('NACK');
                                return channel.nack(messageData, false, false);
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
            console.log(new Date().getUTCMilliseconds() + ' consume from queue' + JSON.stringify(message));
            if (message.msgType === 'eth') {
                axios({
                    method: 'post',
                    url: ETHEREUM_API,
                    data: { jsonrpc: "2.0", method: "eth_getTransactionByHash", params: ["0xbb3a336e3f823ec18197f1e13ee875700f08f03e2cab75f0d0b118dabb44cba0"], id: 1 }
                })
                    .then((response: any) => {
                        console.log(new Date().getUTCMilliseconds() + ' received response from ethereum ' + response.data.result.hash);
                        resolve(response);
                    })
                    .catch((reason) => {
                        console.log(new Date().getUTCMilliseconds() + ' no response from ethereum ' + reason);
                        reject(reason);
                    });

            } else {
                axios.get(BLOCKCHAIN_URI_TENDERMINT + message.data)
                    .then((response: any) => {
                        console.log(new Date().getUTCMilliseconds() + ' received response from blockchain ' + response.data.result.hash);
                        resolve(response);
                    })
                    .catch((reason) => {
                        console.log(new Date().getUTCMilliseconds() + ' no response from blockchain ' + reason);
                        reject(reason);
                    });
            }
        });
    }
}

export default new MessageQ('pds');