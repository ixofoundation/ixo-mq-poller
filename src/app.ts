require('dotenv').config();
import mq from './MessageQ';

try {
  mq.start()
} catch (err) {
  console.log('Error ' + err)
}

process.on('SIGTERM', function () {
  console.log('Shut down');
  mq.connection.close();
});
