"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const MessageQ_1 = __importDefault(require("./MessageQ"));
var pollTimer = process.env.POLLTIMER;
MessageQ_1.default.connect()
    .then((conn) => {
    setInterval(MessageQ_1.default.subscribe(), process.env.pollTimer);
}).catch(() => { });
process.on('SIGTERM', function () {
    console.log('Shut down');
    MessageQ_1.default.connection.close();
});
