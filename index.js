const express = require('express');
const amqp = require('amqplib');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const queueName = 'request_queue';

app.use(cors());
const wss = new WebSocket.Server({ port:8080 });

const clients = new Set();

app.get('/hello', async (req, res) => {
  try {
    const message = 'Hello, world!';

    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    channel.assertQueue(queueName);
    channel.sendToQueue(queueName, Buffer.from(message));

    console.log('Message sent to the queue.');

    res.send('Request received and enqueued for processing.');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred.');
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000.');
});


async function consumeMessages() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    channel.assertQueue(queueName);
    channel.consume(queueName, (message) => {
      const content = message.content.toString();
      console.log('Received message:', content);

      
      setTimeout(() => {
        console.log('Processing complete:', content);
        channel.ack(message);

        
        const response = `Processed response: ${content}`;
        clients.forEach((client) => {
          client.send(response);
        });
      }, 3000); 
    });
  } catch (error) {
    console.error('Error consuming messages:', error);
  }
}

consumeMessages();


app.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
 
wss.on('connection', (ws) => {
  clients.add(ws);

  ws.on('close', () => {
    clients.delete(ws);
  });
});
