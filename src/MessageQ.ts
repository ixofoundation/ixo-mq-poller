import axios from "axios";
import { BroadcastMode } from "./codec/external/cosmos/tx/v1beta1/service";
import * as transactions from "./protoquery/transactions";
import { JsonToArray } from "./protoquery/utils";

const amqplib = require("amqplib");
const dateFormat = require("dateformat");

const BLOCKCHAIN_REST = process.env.BLOCKCHAIN_REST || "";

export class MessageQ {
  connection: any;
  private queue: string;

  constructor(queue: string) {
    this.queue = queue;
  }

  dateTimeLogger(): string {
    return dateFormat(new Date(), "yyyy-mm-dd hh:mm:ss:l");
  }

  start(): Promise<any> {
    const inst = this;
    return new Promise(function (resolve: Function, reject: Function) {
      amqplib.connect(process.env.RABITMQ_URI || "").then(
        (conn: any) => {
          inst.connection = conn;
          inst.connection.createChannel().then((ch: any) => {
            ch.assertExchange("pds.ex", "direct", { durable: true });
            ch.bindQueue(inst.queue, "pds.ex");
            ch.prefetch(50);
            ch.assertQueue(inst.queue, { durable: true });
            ch.consume(inst.queue, (messageData: any) => {
              if (messageData === null) {
                return;
              }
              const message = JSON.parse(messageData.content.toString());
              inst.handleMessage(message.data).then(
                (response) => {
                  const msgResponse = {
                    msgType: message.data.msgType,
                    txHash: message.txHash,
                    data: response,
                  };
                  console.log(
                    inst.dateTimeLogger() +
                      " return blockchain response message " +
                      message.txHash
                  );
                  ch.sendToQueue(
                    "pds.res",
                    Buffer.from(JSON.stringify(msgResponse)),
                    {
                      persistent: false,
                      contentType: "application/json",
                    }
                  );
                  return ch.ack(messageData);
                },
                (error) => {
                  ch.sendToQueue(
                    "pds.res",
                    Buffer.from(
                      JSON.stringify({
                        msgType: "error",
                        data: error,
                        txHash: message.txHash,
                      })
                    ),
                    {
                      persistent: false,
                      contentType: "application/json",
                    }
                  );
                  return ch.ack(messageData);
                }
              );
            });
          });
          console.log(inst.dateTimeLogger() + " RabbitMQ connected");
          resolve(conn);
        },
        () => {
          throw new Error("Cannot connect to RabbitMQ Server");
        }
      );
    });
  }

  private handleMessage(message: any): Promise<any> {
    return new Promise((resolve: Function, reject: Function) => {
      console.log(
        this.dateTimeLogger() + " consume from queue " + JSON.stringify(message)
      );
      if (message.msgType === "eth") {
        console.log(this.dateTimeLogger() + " skipping eth message");
      } else {
        const broadcastUrl = BLOCKCHAIN_REST + "/txs";
        console.log(
          this.dateTimeLogger() + " sending message to " + broadcastUrl
        );
        transactions
          .ServiceBroadcastTx(
            JsonToArray(message.data),
            BroadcastMode.BROADCAST_MODE_UNSPECIFIED
          )
          .then((response) => {
            console.log(response);
          });

        // axios
        //   .post(broadcastUrl, message.data)
        //   .then((response: any) => {
        //     if (response.data && response.data.error) {
        //       console.log(
        //         this.dateTimeLogger() +
        //           " received error response from blockchain " +
        //           JSON.stringify(response.data)
        //       );
        //       reject(response.data.error.data || "Unknown error");
        //     } else {
        //       console.log(
        //         this.dateTimeLogger() +
        //           " received response from blockchain " +
        //           response.data.txhash
        //       );
        //       resolve(response.data);
        //     }
        //   })
        //   .catch((reason) => {
        //     console.log(
        //       this.dateTimeLogger() + " no response from blockchain " + reason
        //     );
        //     reject(reason);
        //   });
      }
    });
  }
}

export default new MessageQ("pds");
