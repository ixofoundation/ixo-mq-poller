"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
var amqplib = require('amqplib');
const BLOCKCHAIN_URI_TENDERMINT = (process.env.BLOCKCHAIN_URI_TENDERMINT || '');
class MessageQ {
    constructor(queue) {
        this.queue = queue;
    }
    connect() {
        var inst;
        inst = this;
        return new Promise(function (resolve, reject) {
            amqplib.connect(process.env.RABITMQ_URI || '')
                .then((conn) => {
                inst.connection = conn;
                resolve(conn);
                console.log('RabbitMQ connected');
            }, () => {
                console.log("Could not initialize RabbitMQ Server");
                throw new Error("Cannot connect to RabbitMQ Server");
            });
        });
    }
    subscribe() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const channel = yield this.connection.createChannel();
                channel.assertQueue(this.queue, {
                    durable: true
                }).then(() => {
                    channel.prefetch(1);
                    channel.consume(this.queue, (messageData) => {
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
                }, (error) => {
                    throw error;
                });
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
    }
    handleMessage(message) {
        return new Promise((resolve, reject) => {
            console.log(new Date().getUTCMilliseconds() + ' consume from queue' + message);
            axios_1.default.get(BLOCKCHAIN_URI_TENDERMINT + message)
                .then((response) => {
                console.log(new Date().getUTCMilliseconds() + ' received response from blockchain');
                resolve(true);
            });
        });
    }
}
exports.MessageQ = MessageQ;
exports.default = new MessageQ('pds');
