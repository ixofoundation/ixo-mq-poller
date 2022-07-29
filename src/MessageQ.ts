import axios from "axios";
import { BroadcastMode } from "./codec/external/cosmos/tx/v1beta1/service";
import { Tx } from "./codec/external/cosmos/tx/v1beta1/tx";
import * as transactions from "./protoquery/transactions";
import * as projects from "./protoquery/projects";
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
    interface messageData {
      tx: {
        msg: {
          type: string;
          value: {
            data: any;
            txHash: string;
            senderDid: string;
            projectDid: string;
            pubKey: string;
          };
        };
      };
    }
    return new Promise(async (resolve: Function, reject: Function) => {
      console.log(
        this.dateTimeLogger() + " consume from queue " + JSON.stringify(message)
      );
      const broadcastUrl = BLOCKCHAIN_REST + "/txs";
      console.log(
        this.dateTimeLogger() + " sending message to " + broadcastUrl
      );
      const parsed: messageData = JSON.parse(message.data);

      console.log("[POLTEST MSG]- ", parsed.tx.msg);
      console.log("[POLTEST DATA]- ", JsonToArray(parsed.tx.msg.value.data));

      // const rsp = await transactions.ServiceBroadcastTx(
      //   JsonToArray(parsed),
      //   BroadcastMode.BROADCAST_MODE_ASYNC
      // );

      switch (message.msgType) {
        case "project/CreateProject":
          {
            projects
              .TransactionCreateProject(
                parsed.tx.msg.value.txHash,
                parsed.tx.msg.value.senderDid,
                parsed.tx.msg.value.projectDid,
                parsed.tx.msg.value.pubKey,
                JsonToArray(parsed.tx.msg.value.data)
              )
              .then((rsp) => {
                console.log("[CREATE_PROJECT_RSP] ", rsp);
              });
          }
          break;
        // case "project/CreateClaim":
        //   {
        //     projects.TransactionCreateProject();
        //   }
        //   break;
        // case "project/CreateAgent":
        //   {
        //     projects.TransactionCreateProject();
        //   }
        //   break;
        // case "project/CreateEvaluation":
        //   {
        //     projects.TransactionCreateProject();
        //   }
        //   break;
        // case "project/UpdateAgent":
        //   {
        //     projects.TransactionCreateProject();
        //   }
        //   break;
        // case "project/UpdateProjectDoc":
        //   {
        //     projects.TransactionCreateProject();
        //   }
        //   break;
        // case "project/UpdateProjectStatus":
        //   {
        //     projects.TransactionCreateProject();
        //   }
        //   break;

        default:
          break;
      }
    });
  }
}

export default new MessageQ("pds");
