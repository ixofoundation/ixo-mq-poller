require('dotenv').config();
import mq from './MessageQ';

var pollTimer = process.env.POLLTIMER;

mq.connect()
    .then((conn: any) => {
        setInterval(mq.subscribe(), process.env.pollTimer);
    }).catch(() => { });

process.on('SIGTERM', function () {
    console.log('Shut down');
    mq.connection.close();
});