import axios from 'axios';

var amqplib = require('amqplib');


const BLOCKCHAIN_URI_TENDERMINT = (process.env.BLOCKCHAIN_URI_TENDERMINT || '');

export class MessageQ {

    connection: any;

    private queue: string;

    constructor(queue: string) {
        this.queue = queue;
    }

    connect(): Promise<any> {
        var inst :any;
        inst = this;
        return new Promise(function (resolve: Function, reject: Function) {            
            amqplib.connect(process.env.RABITMQ_URI || '')
                .then((conn: any) => {
                    inst.connection = conn;
                    resolve(conn);
                    console.log('RabbitMQ connected');
                }, () => {
                    console.log("Could not initialize RabbitMQ Server");
                    throw new Error("Cannot connect to RabbitMQ Server");
                });
        });
    }

    public async subscribe() {
        try {
            const channel = await this.connection.createChannel();
            channel.assertQueue(this.queue, {
                durable: true
            }).then(() => {
                channel.prefetch(1);
                channel.consume(this.queue, (messageData: any) => {

                    if (messageData === null) {
                        return;
                    }

                    const message = JSON.parse(messageData.content.toString());

                    this.handleMessage(message).then(() => {
                        return channel.ack(messageData);
                    }, () => {
                        return channel.nack(messageData);
                    });
                }, { noAck: false });
            }, (error: any) => {
                throw error;
            });

        } catch (error) {
            throw new Error(error.message);
        }
    }

    private handleMessage(message: any): Promise<any> {
        return new Promise((resolve: Function, reject: Function) => {
            console.log(new Date().getUTCMilliseconds() + ' consume from queue' + message);
            axios.get(BLOCKCHAIN_URI_TENDERMINT + message)
                .then((response: any) => {
                    console.log(new Date().getUTCMilliseconds() + ' received response from blockchain');
                    resolve(true);
                })

        });
    }
}

export default new MessageQ('pds');