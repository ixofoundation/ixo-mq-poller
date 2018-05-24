"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const MessageQ_1 = __importDefault(require("./MessageQ"));
MessageQ_1.default.connect()
    .then((conn) => {
    setInterval(MessageQ_1.default.subscribe(), 3000);
}).catch(() => { });
process.on('SIGTERM', function () {
    console.log('Shut down');
    MessageQ_1.default.connection.close();
});
