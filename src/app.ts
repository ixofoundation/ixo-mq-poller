require('dotenv').config();
import mq from './MessageQ';

mq.connect()
    .then((conn: any) => {
        setInterval(mq.subscribe(), process.env.pollTimer);
    }).catch(() => { });

process.on('SIGTERM', function () {
    console.log('Shut down');
    mq.connection.close();
});